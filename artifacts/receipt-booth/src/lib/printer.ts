import { floydSteinbergDither } from './dither';

let connectedDevice: BluetoothDevice | null = null;
let printCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

export async function connectPrinter(): Promise<BluetoothDevice> {
  if (!navigator.bluetooth) {
    throw new Error('Web Bluetooth is not supported in this browser. Please use Chrome or Edge.');
  }

  const device = await navigator.bluetooth.requestDevice({
    filters: [
      { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }
    ],
    optionalServices: ['e7810a71-73ae-499d-8c15-faa9aef0c3f2']
  }).catch(() => {
    // Fallback to accepting all devices if standard filter fails
    return navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb',
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2'
      ]
    });
  });

  if (!device.gatt) {
    throw new Error('Bluetooth device does not support GATT.');
  }

  const server = await device.gatt.connect();
  
  // Try common ESC/POS services
  const services = await server.getPrimaryServices();
  let selectedService: BluetoothRemoteGATTService | null = null;
  
  for (const service of services) {
    if (service.uuid === '000018f0-0000-1000-8000-00805f9b34fb' || 
        service.uuid === 'e7810a71-73ae-499d-8c15-faa9aef0c3f2') {
      selectedService = service;
      break;
    }
  }

  if (!selectedService) {
    // Try the first available service as fallback
    if (services.length > 0) {
      selectedService = services[0];
    } else {
      throw new Error('Could not find suitable Bluetooth service.');
    }
  }

  const characteristics = await selectedService.getCharacteristics();
  let writeChar: BluetoothRemoteGATTCharacteristic | null = null;
  
  for (const char of characteristics) {
    if (char.properties.write || char.properties.writeWithoutResponse) {
      writeChar = char;
      break;
    }
  }

  if (!writeChar) {
    throw new Error('Could not find writeable characteristic.');
  }

  connectedDevice = device;
  printCharacteristic = writeChar;

  device.addEventListener('gattserverdisconnected', () => {
    connectedDevice = null;
    printCharacteristic = null;
  });

  return device;
}

export async function disconnectPrinter() {
  if (connectedDevice && connectedDevice.gatt && connectedDevice.gatt.connected) {
    connectedDevice.gatt.disconnect();
  }
  connectedDevice = null;
  printCharacteristic = null;
}

export function isPrinterConnected(): boolean {
  return connectedDevice !== null && connectedDevice.gatt !== undefined && connectedDevice.gatt.connected;
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function printReceipt(canvas: HTMLCanvasElement): Promise<void> {
  if (!printCharacteristic) {
    throw new Error('Printer not connected');
  }

  // 1. Scale down canvas to max 384px width for standard 58mm printer
  const MAX_WIDTH = 384;
  let printCanvas = canvas;
  if (canvas.width > MAX_WIDTH) {
    printCanvas = document.createElement('canvas');
    printCanvas.width = MAX_WIDTH;
    printCanvas.height = Math.floor(canvas.height * (MAX_WIDTH / canvas.width));
    const ctx = printCanvas.getContext('2d')!;
    ctx.drawImage(canvas, 0, 0, printCanvas.width, printCanvas.height);
  }

  const ctx = printCanvas.getContext('2d')!;
  const width = printCanvas.width;
  const height = printCanvas.height;
  
  // Dither the scaled down version for printing
  const originalImageData = ctx.getImageData(0, 0, width, height);
  const ditheredData = floydSteinbergDither(originalImageData);
  const data = ditheredData.data;

  // Ensure width is divisible by 8
  const widthBytes = Math.ceil(width / 8);
  
  // Create 1-bit raster data
  const rasterData = new Uint8Array(widthBytes * height);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // Image should already be dithered B&W. Just check R < 128 for black.
      const isBlack = data[idx] < 128;
      if (isBlack) {
        const byteIdx = (y * widthBytes) + Math.floor(x / 8);
        const bitIdx = 7 - (x % 8);
        rasterData[byteIdx] |= (1 << bitIdx);
      }
    }
  }

  // ESC/POS Commands
  const ESC_INIT = new Uint8Array([0x1B, 0x40]); // ESC @
  const ALIGN_CENTER = new Uint8Array([0x1B, 0x61, 0x01]); // ESC a 1
  
  // Print raster bit image
  // GS v 0 0 widthBytesL widthBytesH heightL heightH
  const GS_V_0 = new Uint8Array([
    0x1D, 0x76, 0x30, 0x00,
    widthBytes & 0xFF, (widthBytes >> 8) & 0xFF,
    height & 0xFF, (height >> 8) & 0xFF
  ]);

  const FEED_PAPER = new Uint8Array([0x1B, 0x64, 0x04]); // ESC d 4
  const CUT_PAPER = new Uint8Array([0x1D, 0x56, 0x42, 0x00]); // GS V B 0

  const sendCommand = async (payload: Uint8Array) => {
    // Send in chunks of 512 bytes to avoid overflowing Bluetooth MTU
    const CHUNK_SIZE = 512;
    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
      const chunk = payload.slice(i, i + CHUNK_SIZE);
      await printCharacteristic!.writeValue(chunk);
      await delay(10);
    }
  };

  await sendCommand(ESC_INIT);
  await sendCommand(ALIGN_CENTER);
  await sendCommand(GS_V_0);
  await sendCommand(rasterData);
  await sendCommand(FEED_PAPER);
  await sendCommand(CUT_PAPER);
}
