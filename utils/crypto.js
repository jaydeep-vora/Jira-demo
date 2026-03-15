const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Recommended IV length for GCM
const AUTH_TAG_LENGTH = 16;

// Key must be 32 bytes for AES-256
const rawKey = process.env.AES_SECRET_KEY;

if (!rawKey) {
  // In production you should fail fast; here we log to help during dev.
  console.warn('AES_SECRET_KEY is not set. Using a weak, derived key (development only).');
}

// Derive a 32-byte key from the provided secret (or empty string)
const KEY = crypto.createHash('sha256').update(rawKey || '').digest();

function encryptToBase64(plaintext) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  // Concatenate iv + authTag + ciphertext and encode as base64
  const combined = Buffer.concat([iv, authTag, ciphertext]);
  return combined.toString('base64');
}

function decryptFromBase64(base64Payload) {
  const combined = Buffer.from(base64Payload, 'base64');

  if (combined.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid encrypted payload length');
  }

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]);

  return plaintext.toString('utf8');
}

module.exports = {
  encryptToBase64,
  decryptFromBase64
};

