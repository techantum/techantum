// Input sanitization utilities to prevent XSS attacks

// Sanitize string input by removing HTML tags and dangerous characters
export function sanitizeString(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers like onClick=
    .trim()
    .slice(0, 10000); // Limit length
}

// Sanitize email
export function sanitizeEmail(email: string): string {
  if (!email) return '';
  
  return email
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9@._+-]/g, '')
    .slice(0, 254); // Max email length
}

// Sanitize phone number
export function sanitizePhone(phone: string): string {
  if (!phone) return '';
  
  return phone
    .trim()
    .replace(/[^0-9+\s()-]/g, '')
    .slice(0, 20);
}

// Sanitize HTML content (more aggressive)
export function sanitizeHTML(html: string): string {
  if (!html) return '';
  
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '') // Remove object tags
    .replace(/<embed\b[^<]*>/gi, '') // Remove embed tags
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .trim();
}

// Validate and sanitize URL
export function sanitizeURL(url: string): string | null {
  if (!url) return null;
  
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

// SQL injection prevention - escape single quotes
export function escapeSQLString(input: string): string {
  if (!input) return '';
  return input.replace(/'/g, "''");
}

// Sanitize object with multiple fields
export function sanitizeFormData(data: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (value === null || value === undefined) {
      sanitized[key] = '';
    } else {
      sanitized[key] = sanitizeString(String(value));
    }
  }
  
  return sanitized;
}