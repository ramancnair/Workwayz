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

