export async function getCameraStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Camera API not supported in this browser.');
  }

  return await navigator.mediaDevices.getUserMedia({
    video: { 
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  });
}

export function captureFrame(videoElem: HTMLVideoElement): string {
  const canvas = document.createElement('canvas');
  // We want a square crop
  const size = Math.min(videoElem.videoWidth, videoElem.videoHeight);
  
  canvas.width = size;
  canvas.height = size;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  
  // Calculate crop coordinates to center the square
  const startX = (videoElem.videoWidth - size) / 2;
  const startY = (videoElem.videoHeight - size) / 2;
  
  // Mirror the image horizontally so it acts like a mirror
  ctx.translate(size, 0);
  ctx.scale(-1, 1);
  
  ctx.drawImage(
    videoElem,
    startX, startY, size, size, // source rect
    0, 0, size, size            // dest rect
  );
  
  return canvas.toDataURL('image/jpeg', 0.9);
}
