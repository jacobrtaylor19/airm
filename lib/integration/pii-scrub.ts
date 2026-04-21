/**
 * Best-effort PII scrubber for the outbound integration boundary.
 *
 * Replaces email addresses and NANP phone numbers in arbitrary strings.
 * Intended for read-side use on the `/api/integration/v1/*` endpoints —
 * data at rest in the `incidents` table is unchanged so the admin UI keeps
 * full context.
 *
 * Scope is intentionally narrow. Adding new patterns risks false positives
 * that mangle legitimate technical content (stack traces, IDs, slugs).
 */

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE_RE = /(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

export interface ScrubResult<T> {
  value: T;
  hadMatch: boolean;
}

export function scrubString(input: string): ScrubResult<string> {
  let hadMatch = false;
  let out = input.replace(EMAIL_RE, () => {
    hadMatch = true;
    return "<redacted-email>";
  });
  out = out.replace(PHONE_RE, () => {
    hadMatch = true;
    return "<redacted-phone>";
  });
  return { value: out, hadMatch };
}

export function scrubNullableString(input: string | null): ScrubResult<string | null> {
  if (input === null) return { value: null, hadMatch: false };
  return scrubString(input);
}

export function scrubJson(input: unknown): ScrubResult<unknown> {
  if (input === null || input === undefined) {
    return { value: input, hadMatch: false };
  }
  if (typeof input === "string") {
    return scrubString(input);
  }
  if (typeof input !== "object") {
    return { value: input, hadMatch: false };
  }
  if (Array.isArray(input)) {
    let hadMatch = false;
    const out = input.map((item) => {
      const r = scrubJson(item);
      if (r.hadMatch) hadMatch = true;
      return r.value;
    });
    return { value: out, hadMatch };
  }
  let hadMatch = false;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    const r = scrubJson(v);
    if (r.hadMatch) hadMatch = true;
    out[k] = r.value;
  }
  return { value: out, hadMatch };
}
