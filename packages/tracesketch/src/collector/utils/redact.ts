const SENSITIVE_PATTERNS = [
  'password', 'authorization', 'token', 'secret', 
  'apikey', 'api_key', 'api-key', 'cookie', 'auth'
];

function isSensitiveKey(key: string): boolean {
  const normalizedKey = key.toLowerCase().replace(/[-_]/g, '');
  return SENSITIVE_PATTERNS.some(pattern => 
    normalizedKey.includes(pattern.replace(/[-_]/g, ''))
  );
}

export function redactSensitiveData(obj: any): any {
  // Return non-object primitives and null directly
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  // Handle arrays recursively — MUST come before object handling
  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item));
  }

  // Handle nested objects recursively
  const redactedObj: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      redactedObj[key] = 'REDACTED';
    } else {
      redactedObj[key] = redactSensitiveData(value);
    }
  }

  return redactedObj;
}