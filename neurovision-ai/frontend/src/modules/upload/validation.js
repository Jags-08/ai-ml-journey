/**
 * NeuroVision — Upload Validation
 * All file validation logic. Returns structured results.
 *
 * Usage:
 *   import { validateFile } from '@/modules/upload/validation.js';
 *   const { ok, msg } = validateFile(file);
 */

import { MAX_FILE_BYTES, MIN_FILE_BYTES, ALLOWED_TYPES } from '../../constants/limits.js';

/**
 * @param {File|null} file
 * @returns {{ ok: boolean, msg: string }}
 */
export function validateFile(file) {
  if (!file) return { ok: false, msg: 'No file selected.' };

  if (!ALLOWED_TYPES.includes(file.type)) {
    const ext = file.type.split('/')[1]?.toUpperCase() || '?';
    return { ok: false, msg: `Unsupported format: ${ext}. Use JPG, PNG, WebP, GIF, or BMP.` };
  }

  if (file.size > MAX_FILE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return { ok: false, msg: `File too large (${mb} MB). Max 20 MB.` };
  }

  if (file.size < MIN_FILE_BYTES) {
    return { ok: false, msg: 'File too small or corrupt.' };
  }

  return { ok: true, msg: '' };
}

/**
 * Validate multiple files for batch upload.
 * @param {FileList|File[]} files
 * @returns {{ valid: File[], errors: string[] }}
 */
export function validateBatch(files) {
  const valid = [], errors = [];
  for (const f of files) {
    const { ok, msg } = validateFile(f);
    if (ok) valid.push(f);
    else errors.push(`${f.name}: ${msg}`);
  }
  return { valid, errors };
}
