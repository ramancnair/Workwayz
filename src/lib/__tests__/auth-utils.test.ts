import { describe, it, expect, vi, beforeEach } from 'vitest';
import { changeUserPassword } from '../auth-utils';

vi.mock('../firebase', () => ({
  auth: {
    currentUser: { uid: 'fb-user-1', email: 'fb@example.com' },
  },
}));

vi.mock('firebase/auth', () => ({
  updatePassword: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}));

vi.mock('../local-supabase-shim', () => ({
  localSupabaseClient: {
    auth: {
      updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}));

describe('Authentication Utilities (auth-utils.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully update password with firebase provider', async () => {
    const res = await changeUserPassword('NewSecretPass123!', 'firebase');
    expect(res.success).toBe(true);
  });

  it('should successfully update password with supabase provider', async () => {
    const res = await changeUserPassword('NewSecretPass123!', 'supabase');
    expect(res.success).toBe(true);
  });

  it('should successfully update password with local provider', async () => {
    const res = await changeUserPassword('NewSecretPass123!', 'local');
    expect(res.success).toBe(true);
  });

  it('should return error for unsupported auth provider', async () => {
    const res = await changeUserPassword('Pass1234', 'github');
    expect(res.success).toBe(false);
    expect(res.error).toContain('not supported for github provider');
  });
});
