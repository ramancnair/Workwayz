import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getSprintDisplayId(sprint: { id: string; sprintId?: string; title?: string }, fallbackIndex?: number): string {
  if (!sprint) return 'SP-1';
  if (sprint.sprintId) return sprint.sprintId;
  if (sprint.id && /^SP-\d+$/i.test(sprint.id)) return sprint.id;
  if (sprint.title) {
    const titleMatch = sprint.title.match(/(?:sprint\s*|sp-?)(\d+)/i);
    if (titleMatch) return `SP-${titleMatch[1]}`;
  }
  const match = sprint.id?.match(/\d+/);
  if (match) return `SP-${match[0]}`;
  if (fallbackIndex !== undefined) return `SP-${fallbackIndex + 1}`;
  return sprint.id || 'SP-1';
}

export function generateNextSprintId(sprints: { id: string; sprintId?: string; title?: string }[]): string {
  let maxNum = 0;
  (sprints || []).forEach((s, idx) => {
    const sid = getSprintDisplayId(s, idx);
    const match = sid.match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });
  return `SP-${maxNum + 1}`;
}

/**
 * Validates whether a given string is a valid HTTP/HTTPS URL format.
 * Supports URLs with or without explicit protocol (e.g. "https://example.com" or "www.example.com").
 */
export function isValidUrl(urlString: string | null | undefined): boolean {
  if (!urlString || typeof urlString !== 'string') return false;
  const trimmed = urlString.trim();
  if (!trimmed) return false;

  // URLs cannot contain spaces
  if (/\s/.test(trimmed)) return false;

  // Add protocol prefix if missing for URL parsing
  const candidate = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    const host = parsed.hostname;
    if (!host) return false;
    if (host === 'localhost') return true;

    const parts = host.split('.');
    if (parts.length < 2) return false;
    if (parts.some(p => p.length === 0)) return false;

    // Last part (TLD) must be valid letters (at least 2 chars) or valid IPv4 numbers
    const tld = parts[parts.length - 1];
    if (!/^[a-zA-Z]{2,}$|^\d+$/.test(tld)) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Ensures a valid URL has the http:// or https:// protocol prefix for safe href usage.
 */
export function formatUrl(urlString: string | null | undefined): string {
  if (!urlString || typeof urlString !== 'string') return '';
  const trimmed = urlString.trim();
  if (!trimmed) return '';
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * Formats user initials from first name, last name, or full name.
 * Examples: ("John", "Doe") => "JD", ("", "", "Raman Nair") => "RN", ("Alice") => "AL"
 */
export function getUserInitials(firstName?: string | null, lastName?: string | null, fullName?: string | null): string {
  const f = firstName?.trim();
  const l = lastName?.trim();
  if (f && l) {
    return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();
  }
  const name = (fullName || f || l || '').trim();
  if (!name) return '?';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Formats a currency or rate amount for input and view display.
 * - Formats numbers to exactly two decimal places (e.g. 0 -> "0.00", 3.1 -> "3.10", 65464 -> "65464.00").
 * - If value is undefined, null, or empty string:
 *   - if fallbackToZero is true (default): returns "0.00"
 *   - if fallbackToZero is false: returns ""
 */
export function formatRateInput(value: number | string | null | undefined, fallbackToZero: boolean = true): string {
  if (value === undefined || value === null || value === '') {
    return fallbackToZero ? '0.00' : '';
  }
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) {
    return fallbackToZero ? '0.00' : '';
  }
  return num.toFixed(2);
}

/**
 * Matches a target label against a user search query.
 * - If query is empty or whitespace, returns true.
 * - If label is empty/missing, returns false.
 * - If target label contains the full query as a contiguous substring, returns true.
 * - Otherwise, splits the query into tokens and checks that every token matches at a word
 *   boundary (or start of word/token). For purely numeric tokens, matches whole numbers to prevent
 *   a token like "1" from falsely matching "11".
 * This prevents single letters like "e" from matching internal letters of words that already
 * matched earlier tokens.
 */
export function matchSearchQuery(label: string | undefined | null, query: string | undefined | null): boolean {
  if (!query || !query.trim()) return true;
  if (!label) return false;

  const q = query.toLowerCase().trim();
  const lowerLabel = label.toLowerCase();
  if (lowerLabel.includes(q)) return true;

  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every(token => {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const isNumeric = /^\d+$/.test(token);
    let pattern: RegExp;
    if (isNumeric) {
      pattern = new RegExp(`(?:^|[^a-zA-Z0-9])${escaped}(?![0-9])`, 'i');
    } else if (/^[a-z0-9]/i.test(token)) {
      pattern = new RegExp(`(?:^|[^a-zA-Z0-9])${escaped}`, 'i');
    } else {
      pattern = new RegExp(escaped, 'i');
    }
    return pattern.test(label);
  });
}
