/**
 * Validate API key for integration endpoints.
 * Integration routes bypass Supabase session auth in middleware
 * and use this shared-secret validation instead.
 */
export function validateApiKey(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const key = authHeader.slice(7);
  const expected = process.env.PROVISUM_API_KEY;
  if (!expected) {
    console.error("[integration-auth] PROVISUM_API_KEY env var not set");
    return false;
  }
  // Constant-time comparison to prevent timing attacks
  if (key.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < key.length; i++) {
    mismatch |= key.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}
