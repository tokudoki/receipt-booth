export function floydSteinbergDither(imageData: ImageData): ImageData {
  const { width, height, data } = imageData;
  const newImageData = new ImageData(new Uint8ClampedArray(data), width, height);
  const newData = newImageData.data;

  // Convert to grayscale first
  for (let i = 0; i < newData.length; i += 4) {
    const r = newData[i];
    const g = newData[i + 1];
    const b = newData[i + 2];
    // Luminance formula
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    newData[i] = gray;
    newData[i + 1] = gray;
    newData[i + 2] = gray;
    // Keep alpha as is
  }

  // Floyd-Steinberg error diffusion
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldPixel = newData[idx]; // Since it's grayscale, R=G=B
      const newPixel = oldPixel < 128 ? 0 : 255;
      const error = oldPixel - newPixel;

      // Set new pixel
      newData[idx] = newPixel;
      newData[idx + 1] = newPixel;
      newData[idx + 2] = newPixel;

      // Distribute error to neighbors
      // right: 7/16, down-left: 3/16, down: 5/16, down-right: 1/16
      
      const distributeError = (nx: number, ny: number, factor: number) => {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = (ny * width + nx) * 4;
          const val = newData[nIdx] + error * factor;
          newData[nIdx] = Math.max(0, Math.min(255, val));
          newData[nIdx + 1] = newData[nIdx];
          newData[nIdx + 2] = newData[nIdx];
        }
      };

      distributeError(x + 1, y, 7 / 16);
      distributeError(x - 1, y + 1, 3 / 16);
      distributeError(x, y + 1, 5 / 16);
      distributeError(x + 1, y + 1, 1 / 16);
    }
  }

  return newImageData;
}
