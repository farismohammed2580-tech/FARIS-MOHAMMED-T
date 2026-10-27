/**
 * Logo validation, image processing, and prototype persistence utilities
 * for WIN WHITE LAUNDRY business branding.
 */

export const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
export const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

export interface LogoValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates file type and size according to system constraints.
 */
export function validateLogoFile(file: {
  name: string;
  size: number;
  type?: string;
}): LogoValidationResult {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  // Size validation
  if (file.size > MAX_LOGO_SIZE_BYTES) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size exceeds the 5 MB limit (${sizeInMB} MB). Please select an image smaller than 5 MB.`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: 'Selected file is empty.' };
  }

  // Type validation: check MIME type or extension
  const hasValidMime = file.type ? ALLOWED_MIME_TYPES.includes(file.type.toLowerCase()) : false;
  const lowerName = file.name.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

  if (!hasValidMime && !hasValidExt) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a PNG, JPG, JPEG, or WebP image.',
    };
  }

  return { valid: true };
}

/**
 * Reads a File into a clean, optimized Data URL.
 * Resizes images exceeding 600px width/height while preserving aspect ratio
 * to ensure rapid rendering and avoid localStorage quota limits.
 */
export async function processLogoFile(file: File): Promise<string> {
  const validation = validateLogoFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid logo file.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Failed to read the selected image file.'));
    };

    reader.onload = () => {
      const rawDataUrl = reader.result as string;

      // In browser environment, optimize dimensions if canvas is available
      if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
        const img = new Image();
        img.onload = () => {
          try {
            const MAX_DIM = 600;
            let width = img.naturalWidth || img.width;
            let height = img.naturalHeight || img.height;

            if (width <= MAX_DIM && height <= MAX_DIM) {
              // Direct use if already compact
              resolve(rawDataUrl);
              return;
            }

            // Calculate scaled dimensions maintaining aspect ratio
            if (width > height) {
              if (width > MAX_DIM) {
                height = Math.round((height * MAX_DIM) / width);
                width = MAX_DIM;
              }
            } else {
              if (height > MAX_DIM) {
                width = Math.round((width * MAX_DIM) / height);
                height = MAX_DIM;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
              resolve(rawDataUrl);
              return;
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            // Preserve PNG transparency or use WebP
            const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
            const format = isPng ? 'image/png' : 'image/webp';
            const optimizedDataUrl = canvas.toDataURL(format, 0.92);
            resolve(optimizedDataUrl);
          } catch {
            // Fallback to original raw data URL
            resolve(rawDataUrl);
          }
        };

        img.onerror = () => {
          resolve(rawDataUrl);
        };

        img.src = rawDataUrl;
      } else {
        resolve(rawDataUrl);
      }
    };

    reader.readAsDataURL(file);
  });
}
