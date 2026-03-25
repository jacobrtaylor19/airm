const MIN_LENGTH = 12;
const SPECIAL_CHARS = "!@#$%^&*()-_=+[]{}|;:',.<>?/";

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < MIN_LENGTH) {
    errors.push(`Password must be at least ${MIN_LENGTH} characters`);
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one digit");
  }
  if (!new RegExp(`[${escapeRegex(SPECIAL_CHARS)}]`).test(password)) {
    errors.push("Password must contain at least one special character (!@#$%^&*()-_=+[]{}|;:',.<>?/)");
  }

  return { valid: errors.length === 0, errors };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
