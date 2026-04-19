// Validation utilities for security and data integrity

// File validation constants
export const FILE_LIMITS = {
  MAX_SIZE: 50 * 1024 * 1024, // 50MB (increased for high quality images)
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/jpg'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png'],
  MAX_DIMENSIONS: { width: 4096, height: 4096 },
  MAX_FILENAME_LENGTH: 255,
};

// Input validation constants
export const INPUT_LIMITS = {
  MAX_STRING_LENGTH: 1000,
  MAX_NUMBER: 1000000,
  MIN_NUMBER: -1000000,
  MAX_ARRAY_LENGTH: 10000,
};

// Sanitize string input
export const sanitizeString = (input, maxLength = INPUT_LIMITS.MAX_STRING_LENGTH) => {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }
  
  // Remove potentially dangerous characters
  let sanitized = input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
};

// Validate and sanitize number
export const validateNumber = (input, min = INPUT_LIMITS.MIN_NUMBER, max = INPUT_LIMITS.MAX_NUMBER) => {
  const num = Number(input);
  
  if (isNaN(num)) {
    throw new Error('Input must be a valid number');
  }
  
  if (num < min || num > max) {
    throw new Error(`Number must be between ${min} and ${max}`);
  }
  
  return num;
};

// Validate file
export const validateFile = (file) => {
  const errors = [];
  
  if (!file) {
    errors.push('No file provided');
    return errors;
  }
  
  // Check file size
  if (file.size > FILE_LIMITS.MAX_SIZE) {
    errors.push(`File size exceeds ${FILE_LIMITS.MAX_SIZE / (1024 * 1024)}MB limit`);
  }
  
  // Check file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = FILE_LIMITS.ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
  if (!hasValidExtension) {
    errors.push(`File extension not supported. Allowed: ${FILE_LIMITS.ALLOWED_EXTENSIONS.join(', ')}`);
  }
  
  // Check file type (MIME)
  if (file.type && !FILE_LIMITS.ALLOWED_TYPES.includes(file.type)) {
    errors.push(`File type ${file.type} is not supported. Allowed: JPG, JPEG, PNG`);
  }
  
  // Check filename length
  if (file.name.length > FILE_LIMITS.MAX_FILENAME_LENGTH) {
    errors.push(`Filename too long (max ${FILE_LIMITS.MAX_FILENAME_LENGTH} characters)`);
  }
  
  // Check filename for dangerous characters
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (dangerousChars.test(file.name)) {
    errors.push('Filename contains invalid characters');
  }
  
  return errors;
};

// Validate image dimensions
export const validateImageDimensions = (image) => {
  const errors = [];
  
  if (!image) {
    errors.push('No image provided');
    return errors;
  }
  
  if (image.width > FILE_LIMITS.MAX_DIMENSIONS.width || image.height > FILE_LIMITS.MAX_DIMENSIONS.height) {
    errors.push(`Image dimensions exceed ${FILE_LIMITS.MAX_DIMENSIONS.width}x${FILE_LIMITS.MAX_DIMENSIONS.height} limit`);
  }
  
  if (image.width <= 0 || image.height <= 0) {
    errors.push('Image dimensions must be positive');
  }
  
  return errors;
};

// Validate JSON data
export const validateJSON = (data, maxDepth = 10) => {
  const errors = [];
  
  const validateObject = (obj, depth = 0) => {
    if (depth > maxDepth) {
      errors.push('JSON structure too deep');
      return;
    }
    
    if (Array.isArray(obj)) {
      if (obj.length > INPUT_LIMITS.MAX_ARRAY_LENGTH) {
        errors.push(`Array too large (max ${INPUT_LIMITS.MAX_ARRAY_LENGTH} items)`);
        return;
      }
      
      obj.forEach(item => validateObject(item, depth + 1));
    } else if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        if (typeof key !== 'string') {
          errors.push('Object keys must be strings');
          return;
        }
        
        if (key.length > INPUT_LIMITS.MAX_STRING_LENGTH) {
          errors.push('Object key too long');
          return;
        }
        
        validateObject(obj[key], depth + 1);
      });
    }
  };
  
  validateObject(data);
  return errors;
};

// Sanitize HTML content
export const sanitizeHTML = (html) => {
  if (typeof html !== 'string') {
    return '';
  }
  
  // Remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '');
};

// Rate limiting utility
export class RateLimiter {
  constructor(maxRequests = 10, timeWindow = 60000) { // 10 requests per minute
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = new Map();
  }
  
  isAllowed(identifier) {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the time window
    const validRequests = userRequests.filter(time => now - time < this.timeWindow);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }
  
  reset(identifier) {
    this.requests.delete(identifier);
  }
}

// XSS protection for user input
export const escapeHTML = (str) => {
  if (typeof str !== 'string') {
    return String(str);
  }
  
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Validate URL
export const validateURL = (url) => {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }
    return true;
  } catch {
    return false;
  }
};

// Validate and sanitize preset data
export const validatePreset = (preset) => {
  const errors = [];
  
  if (!preset || typeof preset !== 'object') {
    errors.push('Invalid preset format');
    return errors;
  }
  
  // Validate required fields
  if (!preset.name || typeof preset.name !== 'string') {
    errors.push('Preset must have a valid name');
  }
  
  if (preset.name && preset.name.length > INPUT_LIMITS.MAX_STRING_LENGTH) {
    errors.push('Preset name too long');
  }
  
  // Validate blocks if present
  if (preset.blocks && typeof preset.blocks === 'object') {
    const blockErrors = validateJSON(preset.blocks);
    errors.push(...blockErrors);
  }
  
  return errors;
};
