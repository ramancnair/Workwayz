import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/admin/setup/route';

// Mocks for dependencies
const mockSignInWithPassword = vi.fn();
const mockFrom = vi.fn();
const mockAdminCreateUser = vi.fn();
const mockSignUp = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      admin: {
        createUser: mockAdminCreateUser,
      },
      signUp: mockSignUp,
    },
    from: mockFrom,
  })),
}));

vi.mock('@/lib/config-paths', () => ({
  getProfilesPath: vi.fn(() => '/mock/profiles.json'),
  getEnvPath: vi.fn(() => '/mock/.env.local'),
  getDataDirectory: vi.fn(() => require('os').tmpdir()),
}));

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn(),
  },
}));

describe('Admin Setup Mode API (/api/admin/setup)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 MISSING_FIELDS if email or password is empty', async () => {
    const req = new Request('http://localhost:3000/api/admin/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminEmail: '',
        adminPassword: '',
        mode: 'existing',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.code).toBe('MISSING_FIELDS');
  });

  describe('Existing Credentials Linking (mode: "existing" or action: "verify")', () => {
    it('should return AUTH_FAILED when existing credentials do not match database', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      });

      const req = new Request('http://localhost:3000/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: 'nonexistent@example.com',
          adminPassword: 'wrongpassword',
          mode: 'existing',
          authProvider: 'supabase',
          supaUrl: 'https://test.supabase.co',
          supaKey: 'test-key',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('AUTH_FAILED');
      expect(data.error).toContain('Invalid email or password');
    });

    it('should return NOT_SUPER_ADMIN when existing user has role "Project Manager"', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: { id: 'usr-pm-1' } },
        error: null,
      });

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          data: [{
            id: 'E005',
            empId: 'E005',
            firstName: 'Sarah',
            lastName: 'Connor',
            email: 'sarah@example.com',
            accessLevel: 'Project Manager',
          }],
          error: null,
        }),
      });

      const req = new Request('http://localhost:3000/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: 'sarah@example.com',
          adminPassword: 'validpassword',
          mode: 'existing',
          authProvider: 'supabase',
          supaUrl: 'https://test.supabase.co',
          supaKey: 'test-key',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('NOT_SUPER_ADMIN');
      expect(data.currentRole).toBe('Project Manager');
      expect(data.error).toContain('role "Project Manager"');
    });

    it('should return NOT_SUPER_ADMIN when user exists in Auth but has no employee record', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: { id: 'usr-unknown' } },
        error: null,
      });

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          data: [],
          error: null,
        }),
      });

      const req = new Request('http://localhost:3000/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: 'orphan@example.com',
          adminPassword: 'validpassword',
          mode: 'existing',
          authProvider: 'supabase',
          supaUrl: 'https://test.supabase.co',
          supaKey: 'test-key',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('NOT_SUPER_ADMIN');
      expect(data.currentRole).toBe('None');
    });

    it('should successfully verify and link an existing Super Admin account without modifying roles', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: { id: 'usr-admin-1' } },
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValueOnce({ error: null }),
      });

      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValueOnce({
            data: [{
              id: 'E001',
              empId: 'E001',
              firstName: 'Master',
              lastName: 'Admin',
              email: 'admin@workwayz.com',
              accessLevel: 'Super Admin',
            }],
            error: null,
          }),
        })
        .mockReturnValueOnce({
          update: mockUpdate,
        });

      const req = new Request('http://localhost:3000/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: 'admin@workwayz.com',
          adminPassword: 'superadminpass',
          mode: 'existing',
          action: 'setup',
          authProvider: 'supabase',
          supaUrl: 'https://test.supabase.co',
          supaKey: 'test-key',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.isExisting).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.name).toBe('Master Admin');
      expect(data.user.accessLevel).toBe('Super Admin');
      expect(data.user.empId).toBe('E001');
    });
  });

  describe('Fresh Creation Mode (mode: "create")', () => {
    it('should return EMAIL_EXISTS if email is already taken in database during fresh create', async () => {
      mockAdminCreateUser.mockResolvedValueOnce({
        data: null,
        error: { message: 'User already registered', status: 422 },
      });
      mockSignUp.mockResolvedValueOnce({
        data: null,
        error: { message: 'User already registered', status: 422 },
      });

      const req = new Request('http://localhost:3000/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: 'existing@example.com',
          adminPassword: 'newpassword123',
          adminFirstName: 'New',
          adminLastName: 'Admin',
          mode: 'create',
          authProvider: 'supabase',
          supaUrl: 'https://test.supabase.co',
          supaKey: 'test-key',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('EMAIL_EXISTS');
      expect(data.error).toContain('Use Existing Credentials');
    });

    it('should provision Super Admin with local embedded database provider without external keys', async () => {
      const uniqueEmail = `localadmin-${Date.now()}@workwayz.local`;
      const req = new Request('http://localhost:3000/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: uniqueEmail,
          adminPassword: 'LocalAdminPassword123!',
          adminFirstName: 'Local',
          adminLastName: 'Founder',
          mode: 'create',
          dbProvider: 'local',
          authProvider: 'local',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.email).toBe(uniqueEmail);
      expect(data.user.accessLevel).toBe('Super Admin');
      expect(data.user.name).toBe('Local Founder');
    });
  });
});
