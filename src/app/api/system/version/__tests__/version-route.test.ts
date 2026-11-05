import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';

describe('/api/system/version', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('handles GET request and returns application version structure', async () => {
    const req = new Request('http://localhost:3000/api/system/version');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toHaveProperty('currentVersion');
    expect(typeof json.currentVersion).toBe('string');
    expect(json).toHaveProperty('hasUpdate');
    expect(typeof json.hasUpdate).toBe('boolean');
    expect(json).toHaveProperty('deploymentType');
    expect(json).toHaveProperty('releaseUrl');
    expect(json).toHaveProperty('checkedAt');
  });

  it('handles POST request for force-refreshing version metadata', async () => {
    const res = await POST();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toHaveProperty('currentVersion');
    expect(json).toHaveProperty('checkedAt');
  });

  it('gracefully handles offline network errors when registry fails', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error (offline)'));

    const req = new Request('http://localhost:3000/api/system/version?force=true');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.currentVersion).toBeDefined();
    expect(json.isOffline).toBe(true);
    expect(json.hasUpdate).toBe(false);
  });
});

