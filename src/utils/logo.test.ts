import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLogoFile, MAX_LOGO_SIZE_BYTES, OFFICIAL_WIN_WHITE_LOGO_URL } from './logo';

test('validateLogoFile accepts valid PNG, JPG, JPEG, and WebP files within 5MB', () => {
  const pngFile = { name: 'shop_logo.png', size: 1024 * 500, type: 'image/png' };
  assert.equal(validateLogoFile(pngFile).valid, true);

  const jpgFile = { name: 'storefront.jpg', size: 1024 * 1024 * 2, type: 'image/jpeg' };
  assert.equal(validateLogoFile(jpgFile).valid, true);

  const jpegFile = { name: 'brand.jpeg', size: 1024 * 300, type: 'image/jpeg' };
  assert.equal(validateLogoFile(jpegFile).valid, true);

  const webpFile = { name: 'vector_logo.webp', size: 1024 * 200, type: 'image/webp' };
  assert.equal(validateLogoFile(webpFile).valid, true);
});

test('validateLogoFile accepts valid files by extension even if mime is generic', () => {
  const pngByExt = { name: 'logo.PNG', size: 1024 * 100, type: 'application/octet-stream' };
  assert.equal(validateLogoFile(pngByExt).valid, true);
});

test('validateLogoFile rejects files exceeding 5MB limit', () => {
  const bigFile = { name: 'giant_raw.png', size: 6 * 1024 * 1024, type: 'image/png' };
  const result = validateLogoFile(bigFile);
  assert.equal(result.valid, false);
  assert.match(result.error || '', /exceeds the 5 MB limit/i);
});

test('validateLogoFile rejects unsupported file formats like PDF, SVG, GIF, EXE', () => {
  const pdfFile = { name: 'invoice.pdf', size: 1024 * 50, type: 'application/pdf' };
  assert.equal(validateLogoFile(pdfFile).valid, false);

  const gifFile = { name: 'anim.gif', size: 1024 * 50, type: 'image/gif' };
  assert.equal(validateLogoFile(gifFile).valid, false);

  const exeFile = { name: 'malware.exe', size: 1024 * 50, type: 'application/x-msdownload' };
  assert.equal(validateLogoFile(exeFile).valid, false);
});

test('validateLogoFile rejects empty files', () => {
  const emptyFile = { name: 'empty.png', size: 0, type: 'image/png' };
  assert.equal(validateLogoFile(emptyFile).valid, false);
  assert.match(validateLogoFile(emptyFile).error || '', /empty/i);
});

test('OFFICIAL_WIN_WHITE_LOGO_URL points to uploaded emblem asset', () => {
  assert.equal(OFFICIAL_WIN_WHITE_LOGO_URL, '/assets/aistudio/Win_White_Laundry_Emblem__1__46a32c03.png');
});
