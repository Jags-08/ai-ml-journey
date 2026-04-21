/**
 * NeuroVision — Upload Tests
 * Basic unit tests for file validation logic.
 */

import { validateFile, validateBatch } from '../modules/upload/validation.js';
import { MAX_FILE_BYTES } from '../constants/limits.js';

// ── validateFile ───────────────────────────────────────────
describe('validateFile', () => {
  const make = (name, type, size) => ({ name, type, size });

  test('null returns error', () => {
    expect(validateFile(null).ok).toBe(false);
  });

  test('valid JPEG accepted', () => {
    const f = make('photo.jpg', 'image/jpeg', 1024 * 200);
    expect(validateFile(f).ok).toBe(true);
  });

  test('valid PNG accepted', () => {
    const f = make('shot.png', 'image/png', 1024 * 500);
    expect(validateFile(f).ok).toBe(true);
  });

  test('valid WebP accepted', () => {
    const f = make('img.webp', 'image/webp', 1024 * 300);
    expect(validateFile(f).ok).toBe(true);
  });

  test('unsupported type rejected', () => {
    const f = make('doc.pdf', 'application/pdf', 1024);
    const result = validateFile(f);
    expect(result.ok).toBe(false);
    expect(result.msg).toContain('Unsupported');
  });

  test('oversized file rejected', () => {
    const f = make('huge.jpg', 'image/jpeg', MAX_FILE_BYTES + 1);
    const result = validateFile(f);
    expect(result.ok).toBe(false);
    expect(result.msg).toContain('too large');
  });

  test('empty file rejected', () => {
    const f = make('empty.jpg', 'image/jpeg', 0);
    expect(validateFile(f).ok).toBe(false);
  });

  test('exactly at max size accepted', () => {
    const f = make('max.jpg', 'image/jpeg', MAX_FILE_BYTES);
    expect(validateFile(f).ok).toBe(true);
  });
});

// ── validateBatch ──────────────────────────────────────────
describe('validateBatch', () => {
  test('separates valid from invalid', () => {
    const files = [
      { name:'a.jpg', type:'image/jpeg', size: 1024 },
      { name:'b.exe', type:'application/exe', size: 1024 },
      { name:'c.png', type:'image/png', size: 1024 },
    ];
    const { valid, errors } = validateBatch(files);
    expect(valid.length).toBe(2);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('b.exe');
  });

  test('empty array returns empty valid/errors', () => {
    const { valid, errors } = validateBatch([]);
    expect(valid.length).toBe(0);
    expect(errors.length).toBe(0);
  });
});
