'use client';

/**
 * Cloudinary Storage utility for reference images and site assets
 * Completely replaces Firebase Storage for 100% free hosting
 */

// Allowed image types and max size
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB raw upload cap — files are resized/compressed below before upload
const MAX_DIMENSION = 1024; // Max width/height in pixels
const COMPRESSION_QUALITY = 0.8;

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const hasAllowedType = ALLOWED_TYPES.includes(file.type);
  const hasAllowedExtension = ALLOWED_EXTENSIONS.includes(extension);
  // Some browsers (especially on Android/Windows) leave file.type blank or
  // unrecognized for HEIC/HEIF photos straight off a phone camera, so fall
  // back to checking the file extension before rejecting it.
  if (!hasAllowedType && !hasAllowedExtension) {
    return { valid: false, error: 'Nur JPEG, PNG, WEBP, HEIC/HEIF Dateien erlaubt' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `Datei zu groß. Maximum ${MAX_FILE_SIZE / (1024 * 1024)}MB` };
  }
  return { valid: true };
}

export async function processImageFile(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Image compression failed'));
        },
        'image/jpeg',
        COMPRESSION_QUALITY
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Uploads a reference image to Cloudinary (Public & Free)
 */
export async function uploadReferenceImage(
  userId: string,
  appointmentId: string,
  file: File
): Promise<string> {
  const validation = validateImageFile(file);
  if (!validation.valid) throw new Error(validation.error || 'Invalid file');

  const processedBlob = await processImageFile(file);
  
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary credentials missing in Environment Variables');
  }

  const formData = new FormData();
  formData.append('file', processedBlob, file.name);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', `rebo-salon/reference-images/${userId}/${appointmentId}`);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (data.secure_url) {
    return data.secure_url;
  } else {
    throw new Error(data.error?.message || 'Cloudinary upload failed');
  }
}

/**
 * Uploads a site asset (Hero, About, Gallery) to Cloudinary
 */
export async function uploadSiteAsset(
  file: File,
  folder: string = 'general'
): Promise<string> {
  const validation = validateImageFile(file);
  if (!validation.valid) throw new Error(validation.error || 'Invalid file');

  const processedBlob = await processImageFile(file);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary credentials missing in Environment Variables');
  }

  const formData = new FormData();
  formData.append('file', processedBlob, file.name);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', `rebo-salon/site-assets/${folder}`);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (data.secure_url) {
    return data.secure_url;
  } else {
    throw new Error(data.error?.message || 'Cloudinary upload failed');
  }
}

/**
 * Unsigned client-side uploads cannot be deleted for security reasons.
 * You can manage/delete assets directly inside your Cloudinary Dashboard.
 */
export async function deleteReferenceImage(downloadURL: string): Promise<void> {
  console.warn('Delete action disabled: Client-side deletion is not supported for unsigned Cloudinary uploads.');
}

export async function getSignedUploadUrl(): Promise<any> {
  throw new Error('Signed URLs not implemented - using unsigned Cloudinary uploads instead.');
}