export interface DerivedIdentity {
  username: string;
  fullName: string;
}

export function deriveIdentity(email: string): DerivedIdentity {
  return {
    username: usernameFromEmail(email),
    fullName: fullNameFromEmail(email)
  };
}

export function usernameFromEmail(email: string): string {
  return email
    .split('@')[0]
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30) || 'user';
}

export function fullNameFromEmail(email: string): string {
  const local = email.split('@')[0] || 'user';
  const words = local
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1));
  return words.join(' ') || 'User';
}
