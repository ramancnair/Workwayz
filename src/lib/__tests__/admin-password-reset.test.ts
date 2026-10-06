import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/users/reset-password/route';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 'emp-101',
          empId: 'E101',
          email: 'member@example.com',
          accessLevel: 'Team Member'
        }
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
    })
  }
}));

vi.mock('@/lib/db-provider', () => ({
  db: {},
  doc: vi.fn(),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({ email: 'member@example.com', accessLevel: 'Team Member' })
  }),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
  isSupabaseActive: vi.fn().mockReturnValue(true)
}));

describe('Admin Password Reset API (/api/users/reset-password)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 if both email and empId are missing', async () => {
    const req = new Request('http://localhost:3000/api/users/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Email or Emp ID is required');
  });

  it('should return 403 and prohibit resetting Super Admin passwords', async () => {
    const { supabase } = await import('@/lib/supabase');
    (supabase as any).from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 'sa-1',
          empId: 'E001',
          email: 'superadmin@example.com',
          accessLevel: 'Super Admin'
        }
      })
    });

    const req = new Request('http://localhost:3000/api/users/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@example.com', empId: 'E001' })
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Super Admin accounts cannot have their password reset');
  });

  it('should successfully reset a standard user password to default (P@ssw0rd)', async () => {
    const req = new Request('http://localhost:3000/api/users/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'member@example.com', empId: 'E101' })
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain('Password has been reset to default (P@ssw0rd)');
  });
});
