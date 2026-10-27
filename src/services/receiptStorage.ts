/**
 * Persistent storage service for Expense Receipt Images using IndexedDB.
 *
 * This service ensures receipt photos and documents persist reliably across
 * browser reloads, mobile tab closures, and device restarts without relying
 * on temporary browser-only blob URLs (URL.createObjectURL) that expire upon session end.
 *
 * Supports JPG, JPEG, PNG, and WebP with automatic client-side photo optimization
 * (retaining high readability for receipts while preventing excessive storage overhead).
 */

const DB_NAME = 'wwl_receipts_db_v1';
const DB_VERSION = 1;
const STORE_NAME = 'receipt_images';

export interface StoredReceipt {
  id: string; // usually exp-[timestamp] or receipt-[timestamp]
  dataUrl: string; // persistent Base64 Data URL (data:image/jpeg;base64,...)
  mimeType: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const ALLOWED_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Validates file type and file size.
 */
export function validateReceiptFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  // Check file type / extension
  const isMimeValid = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());
  const isExtValid = ALLOWED_EXTENSIONS.test(file.name);

  if (!isMimeValid && !isExtValid) {
    return {
      valid: false,
      error: 'Invalid file format. Please upload a JPG, JPEG, PNG, or WebP image.',
    };
  }

  // Check file size (max 8MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${sizeInMB}MB). Maximum allowed size is 8MB.`,
    };
  }

  return { valid: true };
}

/**
 * Open or upgrade the IndexedDB database.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open persistent receipt database.'));
    };
  });
}

/**
 * Resizes and compresses image to maintain crisp readability of receipts
 * while keeping persistent data lightweight.
 */
export async function optimizeReceiptImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      if (!rawDataUrl) {
        reject(new Error('Unable to read selected file.'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const MAX_WIDTH = 1800;
          const MAX_HEIGHT = 1800;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            if (width > height) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            } else {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            // Fallback to raw data URL if canvas context fails
            resolve(rawDataUrl);
            return;
          }

          // Use white background for transparent PNG receipts to ensure readability
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Prefer WebP or JPEG for optimal compression
          const targetMime = file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
          const compressedDataUrl = canvas.toDataURL(targetMime, 0.85);
          resolve(compressedDataUrl);
        } catch {
          // If canvas processing fails, fallback to original data URL
          resolve(rawDataUrl);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to decode the image file.'));
      };

      img.src = rawDataUrl;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read image file from disk.'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Saves a receipt image permanently in IndexedDB.
 */
export async function saveReceiptImage(
  id: string,
  dataUrl: string,
  fileName: string = 'receipt.jpg',
  mimeType: string = 'image/jpeg'
): Promise<StoredReceipt> {
  const record: StoredReceipt = {
    id,
    dataUrl,
    fileName,
    mimeType,
    sizeBytes: dataUrl.length,
    uploadedAt: new Date().toISOString(),
  };

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.put(record);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error('Failed to save receipt image to IndexedDB.'));
    });
  } catch (err) {
    console.warn('IndexedDB write warning:', err);
  }

  return record;
}

/**
 * Retrieves a receipt image by expense/receipt ID from IndexedDB.
 */
export async function getReceiptImage(id: string): Promise<string | null> {
  if (!id) return null;
  try {
    const db = await openDB();
    return new Promise<string | null>((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        const result = req.result as StoredReceipt | undefined;
        resolve(result?.dataUrl || null);
      };

      req.onerror = () => {
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

/**
 * Deletes a receipt image from IndexedDB.
 */
export async function deleteReceiptImage(id: string): Promise<void> {
  if (!id) return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => resolve(); // silent resolution
    });
  } catch {
    // silent catch
  }
}
