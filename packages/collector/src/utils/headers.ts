/**
 * Remove hop-by-hop / unsafe headers that cause fetch to fail with 408
 * when replaying a stored request. Mutates and returns the same object.
 * Checks both lowercase and capitalized variants since stored header casing may vary.
 */
export function stripUnsafeHeaders(headers: Record<string, any>): Record<string, any> {
  delete headers["content-length"];
  delete headers["Content-Length"];
  delete headers["host"];
  delete headers["Host"];
  delete headers["connection"];
  delete headers["Connection"];
  return headers;
}
