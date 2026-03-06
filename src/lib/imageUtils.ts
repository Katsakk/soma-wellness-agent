import heic2any from "heic2any";

function drawBitmapToJpeg(source: ImageBitmap | HTMLImageElement, maxDimension: number, quality: number): string {
  const ratio = Math.min(maxDimension / source.width, maxDimension / source.height, 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(source.width * ratio);
  canvas.height = Math.round(source.height * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}


export async function compressImage(
  file: File,
  maxDimension = 1024,
  quality = 0.65
): Promise<string> {
  // Try createImageBitmap first (works for standard formats)
  try {
    const bitmap = await createImageBitmap(file);
    const jpeg = drawBitmapToJpeg(bitmap, maxDimension, quality);
    bitmap.close();
    return jpeg;
  } catch {
    // fall through
  }

  // Try HEIC/HEIF conversion
  const isHeic = file.type === "image/heic" || file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif");
  if (isHeic) {
    try {
      const converted = await heic2any({ blob: file, toType: "image/jpeg", quality });
      const jpeg = Array.isArray(converted) ? converted[0] : converted;
      const bitmap = await createImageBitmap(jpeg);
      const result = drawBitmapToJpeg(bitmap, maxDimension, quality);
      bitmap.close();
      return result;
    } catch {
      // fall through
    }
  }

  // Fall back to <img> element via data URL
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error(`Failed to read file: ${reader.error?.message}`));
    reader.readAsDataURL(file);
  });

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        resolve(drawBitmapToJpeg(img, maxDimension, quality));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
