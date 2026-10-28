import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateSession,
  clearSession,
  USER_STORAGE_KEY,
  ACTIVITY_STORAGE_KEY,
  SESSION_TTL_MS,
  INACTIVITY_TIMEOUT_MS,
} from '../session';

describe('Session Validation Utilities (session.ts)', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};

    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    });

    vi.stubGlobal('document', {
      cookie: '',
    });
  });

  it('should return isValid: false when no session exists', () => {
    const result = validateSession();
    expect(result.isValid).toBe(false);
    expect(result.session).toBeNull();
  });

  it('should reject and clear malformed JSON session', () => {
    mockStorage[USER_STORAGE_KEY] = 'not-valid-json{';
    const result = validateSession(true);
    expect(result.isValid).toBe(false);
    expect(mockStorage[USER_STORAGE_KEY]).toBeUndefined();
  });

  it('should reject and clear session missing email or ID', () => {
    mockStorage[USER_STORAGE_KEY] = JSON.stringify({
      name: 'Test User',
      email: '',
      uid: '',
      empId: '',
    });

    const result = validateSession(true);
    expect(result.isValid).toBe(false);
    expect(mockStorage[USER_STORAGE_KEY]).toBeUndefined();
  });

  it('should accept structurally valid session with uid and rememberMe: true', () => {
    const now = Date.now();
    mockStorage[USER_STORAGE_KEY] = JSON.stringify({
      name: 'Raman',
      email: 'ramanreadsmail@gmail.com',
      uid: 'user-uid-123',
      issuedAt: now - 1000,
      rememberMe: true,
    });

    const result = validateSession(true);
    expect(result.isValid).toBe(true);
    expect(result.session?.email).toBe('ramanreadsmail@gmail.com');
  });

  it('should reject session that exceeded 24-hour TTL', () => {
    const now = Date.now();
    mockStorage[USER_STORAGE_KEY] = JSON.stringify({
      name: 'Raman',
      email: 'ramanreadsmail@gmail.com',
      uid: 'user-uid-123',
      issuedAt: now - (SESSION_TTL_MS + 1000), // > 24 hours ago
      rememberMe: true,
    });

    const result = validateSession(true);
    expect(result.isValid).toBe(false);
    expect(mockStorage[USER_STORAGE_KEY]).toBeUndefined();
  });

  it('should reject session when rememberMe is false and last activity exceeded 2 hours', () => {
    (document as any).cookie = 'workwayz_session_active=true';
    const now = Date.now();
    mockStorage[USER_STORAGE_KEY] = JSON.stringify({
      name: 'Raman',
      email: 'ramanreadsmail@gmail.com',
      uid: 'user-uid-123',
      issuedAt: now - (3 * 60 * 60 * 1000), // 3 hours ago
      rememberMe: false,
    });
    mockStorage[ACTIVITY_STORAGE_KEY] = (now - (INACTIVITY_TIMEOUT_MS + 5000)).toString(); // 2h 5s ago

    const result = validateSession(true);
    expect(result.isValid).toBe(false);
    expect(mockStorage[USER_STORAGE_KEY]).toBeUndefined();
  });

  it('should NOT reject fresh login even if rememberMe is false and last activity was missing or old', () => {
    (document as any).cookie = 'workwayz_session_active=true';
    const now = Date.now();
    mockStorage[USER_STORAGE_KEY] = JSON.stringify({
      name: 'Raman',
      email: 'ramanreadsmail@gmail.com',
      uid: 'user-uid-123',
      issuedAt: now - 500, // 500ms ago (fresh login!)
      rememberMe: false,
    });
    mockStorage[ACTIVITY_STORAGE_KEY] = (now - (5 * 60 * 60 * 1000)).toString(); // old stale timestamp

    const result = validateSession(true);
    expect(result.isValid).toBe(true);
    expect(result.session?.email).toBe('ramanreadsmail@gmail.com');
  });

  it('should refresh stale activity timestamp when session was issued recently (< 2h ago)', () => {
    (document as any).cookie = 'workwayz_session_active=true';
    const now = Date.now();
    mockStorage[USER_STORAGE_KEY] = JSON.stringify({
      name: 'Raman',
      email: 'ramanreadsmail@gmail.com',
      uid: 'user-uid-123',
      issuedAt: now - (30 * 60 * 1000), // 30 minutes ago
      rememberMe: false,
    });
    mockStorage[ACTIVITY_STORAGE_KEY] = (now - (3 * 60 * 60 * 1000)).toString(); // stale activity from 3 hours ago

    const result = validateSession(true);
    expect(result.isValid).toBe(true);
    // Activity should have been updated to approximately now
    const updatedActivity = parseInt(mockStorage[ACTIVITY_STORAGE_KEY], 10);
    expect(updatedActivity).toBeGreaterThanOrEqual(now - 1000);
  });

  it('should reject a non-remembered session once the browser session cookie is gone (browser closed)', () => {
    const now = Date.now();
    mockStorage[USER_STORAGE_KEY] = JSON.stringify({
      name: 'Raman',
      email: 'ramanreadsmail@gmail.com',
      uid: 'user-uid-123',
      issuedAt: now - 5 * 60 * 1000, // 5 minutes ago, well inside TTL and inactivity window
      rememberMe: false,
    });
    mockStorage[ACTIVITY_STORAGE_KEY] = now.toString();

    const result = validateSession(true);
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe('Browser session ended');
    expect(mockStorage[USER_STORAGE_KEY]).toBeUndefined();
  });

  it('should treat a session without a rememberMe flag as non-remembered', () => {
    const now = Date.now();
    mockStorage[USER_STORAGE_KEY] = JSON.stringify({
      name: 'Raman',
      email: 'ramanreadsmail@gmail.com',
      uid: 'user-uid-123',
      issuedAt: now - 1000,
    });

    expect(validateSession(true).isValid).toBe(false);
  });

  it('should accept a non-remembered session while the browser session cookie exists', () => {
    (document as any).cookie = 'workwayz_session_active=true';
    mockStorage[USER_STORAGE_KEY] = JSON.stringify({
      name: 'Raman',
      email: 'ramanreadsmail@gmail.com',
      uid: 'user-uid-123',
      issuedAt: Date.now() - 1000,
      rememberMe: false,
    });

    expect(validateSession(true).isValid).toBe(true);
  });

  it('should keep a remembered session valid without the browser session cookie', () => {
    mockStorage[USER_STORAGE_KEY] = JSON.stringify({
      name: 'Raman',
      email: 'ramanreadsmail@gmail.com',
      uid: 'user-uid-123',
      issuedAt: Date.now() - 60 * 60 * 1000,
      rememberMe: true,
    });

    expect(validateSession(true).isValid).toBe(true);
  });

  it('clearSession should remove storage keys and wipe cookie', () => {
    mockStorage[USER_STORAGE_KEY] = 'some-user';
    mockStorage[ACTIVITY_STORAGE_KEY] = '12345';
    clearSession();
    expect(mockStorage[USER_STORAGE_KEY]).toBeUndefined();
    expect(mockStorage[ACTIVITY_STORAGE_KEY]).toBeUndefined();
  });
});
