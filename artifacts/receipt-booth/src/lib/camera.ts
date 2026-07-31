export async function getCameraStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Camera API not supported in this browser.');
  }

  // Try front camera first; fall back to any camera if the constraint is rejected
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
  } catch {
    return await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
  }
}

export function captureFrame(videoElem: HTMLVideoElement): string {
  if (videoElem.videoWidth === 0 || videoElem.videoHeight === 0) {
    throw new Error('Camera is not ready yet — video dimensions are zero. Please wait for the preview to appear before shooting.');
  }

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
  
  // White background prevents blank JPEG on iOS when transparency collapses
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

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
