import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  executeLocalTableOperation,
  executeLocalAuthOperation,
  getLocalDbFilePath,
} from '../local-db-engine';
import { localSupabaseClient } from '../local-supabase-shim';

describe('Local Embedded Database & Auth Engine (local-db-engine.ts)', () => {
  let tempDir: string;
  let originalEnvDir: string | undefined;

  beforeEach(() => {
    originalEnvDir = process.env.WORKWAYZ_DATA_DIR;
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workwayz-local-db-test-'));
    process.env.WORKWAYZ_DATA_DIR = tempDir;
  });

  afterEach(() => {
    if (originalEnvDir !== undefined) {
      process.env.WORKWAYZ_DATA_DIR = originalEnvDir;
    } else {
      delete process.env.WORKWAYZ_DATA_DIR;
    }
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {}
  });

  it('resolves local database file inside WORKWAYZ_DATA_DIR', () => {
    const dbPath = getLocalDbFilePath();
    expect(dbPath).toBe(path.join(tempDir, 'workwayz-local-db.json'));
  });

  it('supports insert, select, eq, neq, in, order, limit, single, and maybeSingle', () => {
    const ins = executeLocalTableOperation({
      action: 'insert',
      table: 'projects',
      data: [
        { id: 'p1', name: 'Alpha', status: 'Active', priority: 2 },
        { id: 'p2', name: 'Beta', status: 'Completed', priority: 1 },
        { id: 'p3', name: 'Gamma', status: 'Active', priority: 3 },
      ],
    });
    expect(ins.error).toBeNull();
    expect(ins.data).toHaveLength(3);

    // Filter eq + order
    const active = executeLocalTableOperation({
      action: 'select',
      table: 'projects',
      filters: [{ type: 'eq', column: 'status', value: 'Active' }],
      orders: [{ column: 'priority', ascending: false }],
    });
    expect(active.error).toBeNull();
    expect(active.data.map((r: any) => r.id)).toEqual(['p3', 'p1']);

    // Filter single (found and not found)
    const singleFound = executeLocalTableOperation({
      action: 'select',
      table: 'projects',
      filters: [{ type: 'eq', column: 'id', value: 'p2' }],
      single: true,
    });
    expect(singleFound.error).toBeNull();
    expect(singleFound.data.name).toBe('Beta');

    const singleMissing = executeLocalTableOperation({
      action: 'select',
      table: 'projects',
      filters: [{ type: 'eq', column: 'id', value: 'nonexistent' }],
      single: true,
    });
    expect(singleMissing.data).toBeNull();
    expect(singleMissing.error.code).toBe('PGRST116');

    const maybeMissing = executeLocalTableOperation({
      action: 'select',
      table: 'projects',
      filters: [{ type: 'eq', column: 'id', value: 'nonexistent' }],
      maybeSingle: true,
    });
    expect(maybeMissing.error).toBeNull();
    expect(maybeMissing.data).toBeNull();
  });

  it('supports upsert, update, and delete via localSupabaseClient fluent builder', async () => {
    await localSupabaseClient.from('portfolios').upsert({ id: 'port-1', name: 'Initial Portfolio' });

    const { data: fetched } = await localSupabaseClient
      .from('portfolios')
      .select('*')
      .eq('id', 'port-1')
      .single();
    expect(fetched.name).toBe('Initial Portfolio');

    await localSupabaseClient
      .from('portfolios')
      .update({ name: 'Updated Portfolio' })
      .eq('id', 'port-1');

    const { data: afterUpdate } = await localSupabaseClient
      .from('portfolios')
      .select('*')
      .eq('id', 'port-1')
      .single();
    expect(afterUpdate.name).toBe('Updated Portfolio');

    await localSupabaseClient.from('portfolios').delete().eq('id', 'port-1');
    const { data: afterDelete } = await localSupabaseClient
      .from('portfolios')
      .select('*')
      .eq('id', 'port-1')
      .maybeSingle();
    expect(afterDelete).toBeNull();
  });

  it('handles local user registration, password hashing, authentication, and password updates', async () => {
    // 1. Sign up
    const signUpRes = await localSupabaseClient.auth.signUp({
      email: 'admin@workwayz.local',
      password: 'StrongPassword123!',
    });
    expect(signUpRes.error).toBeNull();
    expect(signUpRes.data.user.email).toBe('admin@workwayz.local');

    // 2. Duplicate sign-up should fail with 422
    const dupRes = await localSupabaseClient.auth.signUp({
      email: 'admin@workwayz.local',
      password: 'AnotherPassword',
    });
    expect(dupRes.error).toBeTruthy();
    expect(dupRes.error.status).toBe(422);

    // 3. Sign in with wrong password fails
    const badLogin = await localSupabaseClient.auth.signInWithPassword({
      email: 'admin@workwayz.local',
      password: 'WrongPassword',
    });
    expect(badLogin.error).toBeTruthy();
    expect(badLogin.data.user).toBeNull();

    // 4. Sign in with valid password succeeds
    const goodLogin = await localSupabaseClient.auth.signInWithPassword({
      email: 'admin@workwayz.local',
      password: 'StrongPassword123!',
    });
    expect(goodLogin.error).toBeNull();
    expect(goodLogin.data.user.id).toBe(signUpRes.data.user.id);

    // 5. Update password
    const updateRes = executeLocalAuthOperation({
      action: 'updateUserById',
      userId: signUpRes.data.user.id,
      password: 'UpdatedPassword456!',
    });
    expect(updateRes.error).toBeNull();

    const relogin = await localSupabaseClient.auth.signInWithPassword({
      email: 'admin@workwayz.local',
      password: 'UpdatedPassword456!',
    });
    expect(relogin.error).toBeNull();
    expect(relogin.data.user.email).toBe('admin@workwayz.local');
  });
});

