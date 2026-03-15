const { encryptToBase64, decryptFromBase64 } = require('../utils/crypto');

/**
 * Decrypt incoming request bodies.
 * Expects JSON like: { "payload": "<base64>" }
 * After decryption, replaces req.body with the parsed JSON object.
 */
const decryptRequestBody = (req, res, next) => {
  try {
    // Only handle JSON bodies that follow the { payload } convention
    
    if (req.body && typeof req.body.payload === 'string') {
      console.log('Param', req.body.payload);
      const decrypted = decryptFromBase64(req.body.payload);
      try {
        req.body = JSON.parse(decrypted);
      } catch (parseErr) {
        return res.status(400).json({
          success: false,
          message: 'Invalid encrypted payload: not valid JSON'
        });
      }
      req.isDecrypted = true;
    }

    next();
  } catch (error) {
    console.error('Request decryption error:', error);
    return res.status(400).json({
      success: false,
      message: 'Invalid encrypted payload'
    });
  }
};

/**
 * Encrypt JSON responses.
 * Wraps res.json so that any response body is encrypted with AES-256-GCM
 * and returned as: { payload: "<base64>" }.
 */
const encryptResponseBody = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    try {
      // Allow clients to opt-out of encryption with a header
      if (req.headers['x-no-encrypt-response'] === '1') {
        return originalJson(body);
      }

      const payloadString = JSON.stringify(body);
      const encrypted = encryptToBase64(payloadString);

      res.setHeader('X-Encrypted', '1');
      return originalJson({ payload: encrypted });
    } catch (error) {
      console.error('Response encryption error:', error);
      // Fallback: send unencrypted response if encryption fails
      return originalJson(body);
    }
  };

  next();
};

module.exports = {
  decryptRequestBody,
  encryptResponseBody
};

