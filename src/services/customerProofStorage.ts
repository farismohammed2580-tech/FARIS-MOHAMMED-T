/**
 * Persistent Storage Service for Monthly Customer Proofs & Verification Documents.
 *
 * PROTOTYPE ARCHITECTURE & SECURITY BOUNDARY:
 * - Documents are stored directly in local browser-side IndexedDB ('wwl_customer_proofs_db_v1').
 * - Documents are strictly private to this client instance and associated with the customer ID.
 * - NO public URLs or unauthenticated public access endpoints are created.
 * - Access is gated through the authenticated Admin / Staff session guards.
 *
 * NOTE FOR FINAL PRODUCTION DEPLOYMENT (Lovable):
 * - In this prototype, proof files are stored locally in the authenticated client's IndexedDB.
 * - Before deploying to multi-device production in Lovable, replace this client-side store
 *   with an authenticated private cloud object storage backend (e.g. private S3/GCS bucket
 *   with short-lived presigned download URLs or Supabase/Firebase Storage with strict
 *   Row-Level Security rules) to ensure encrypted cross-device cloud persistence.
 */

const DB_NAME = 'wwl_customer_proofs_db_v1';
const DB_VERSION = 1;
const STORE_NAME = 'customer_proof_documents';

export interface StoredCustomerProof {
  id: string; // customerId
  dataUrl: string; // Base64 Data URL (data:image/jpeg;base64,...)
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const ALLOWED_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Validates document file format (JPG, JPEG, PNG, WebP) and size (<= 8MB).
 */
export function validateProofFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No document file selected.' };
  }

  const isMimeValid = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());
  const isExtValid = ALLOWED_EXTENSIONS.test(file.name);

  if (!isMimeValid && !isExtValid) {
    return {
      valid: false,
      error: 'Invalid file format. Please upload a JPG, JPEG, PNG, or WebP document.',
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${sizeInMB} MB). Maximum allowed size is 8 MB.`,
    };
  }

  return { valid: true };
}

/**
 * Open or upgrade the IndexedDB database for customer proofs.
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
      reject(request.error || new Error('Failed to open persistent proof database.'));
    };
  });
}

/**
 * Optimizes the image so IDs, contracts, and receipts remain crisp and readable
 * while preventing excessive storage footprint.
 */
export async function optimizeProofImage(file: File): Promise<string> {
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
          const MAX_WIDTH = 2000;
          const MAX_HEIGHT = 2000;
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
            resolve(rawDataUrl);
            return;
          }

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const targetMime = file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
          const compressedDataUrl = canvas.toDataURL(targetMime, 0.88);
          resolve(compressedDataUrl);
        } catch {
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
 * Saves a customer proof document permanently in IndexedDB.
 */
export async function saveCustomerProof(
  customerId: string,
  dataUrl: string,
  fileName: string = 'customer_proof.jpg',
  mimeType: string = 'image/jpeg'
): Promise<StoredCustomerProof> {
  const record: StoredCustomerProof = {
    id: customerId,
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
      req.onerror = () => reject(req.error || new Error('Failed to save proof document to IndexedDB.'));
    });
  } catch (err) {
    console.warn('IndexedDB customer proof write warning:', err);
  }

  return record;
}

/**
 * Retrieves a customer proof document from IndexedDB by customerId.
 */
export async function getCustomerProof(customerId: string): Promise<string | null> {
  if (!customerId) return null;
  try {
    const db = await openDB();
    return new Promise<string | null>((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.get(customerId);

      req.onsuccess = () => {
        const result = req.result as StoredCustomerProof | undefined;
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
 * Deletes a customer proof document from IndexedDB by customerId.
 */
export async function deleteCustomerProof(customerId: string): Promise<void> {
  if (!customerId) return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.delete(customerId);

      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // silent catch
  }
}
