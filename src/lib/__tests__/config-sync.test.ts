import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { syncConnectionsToEnv, readEnvMap, writeEnvMap } from '../config-sync';

vi.mock('fs', async () => {
    const actual = await vi.importActual<typeof import('fs')>('fs');
    return {
        ...actual,
        default: {
            ...actual,
            readFileSync: vi.fn(),
            writeFileSync: vi.fn(),
            existsSync: vi.fn(),
        },
        readFileSync: vi.fn(),
        writeFileSync: vi.fn(),
        existsSync: vi.fn(),
    };
});

describe('Config Sync Engine (config-sync.ts)', () => {
    let mockFiles: Record<string, string> = {};

    beforeEach(() => {
        vi.clearAllMocks();
        mockFiles = {};

        vi.mocked(fs.existsSync).mockImplementation((p: any) => {
            return Object.prototype.hasOwnProperty.call(mockFiles, p.toString());
        });

        vi.mocked(fs.readFileSync).mockImplementation((p: any) => {
            const key = p.toString();
            if (mockFiles[key] !== undefined) return mockFiles[key];
            throw new Error(`File not found: ${key}`);
        });

        vi.mocked(fs.writeFileSync).mockImplementation((p: any, data: any) => {
            mockFiles[p.toString()] = data.toString();
        });
    });

    it('should synchronize active Supabase profile to .env.local', () => {
        const envLocalPath = path.join(process.cwd(), '.env.local');
        mockFiles[envLocalPath] = 'CUSTOM_VAR="keep_me"\n';

        const mockConnections = {
            database: [
                {
                    id: 'db-1',
                    profileName: 'Supabase Main',
                    provider: 'supabase',
                    isActive: true,
                    supabaseUrl: 'https://test.supabase.co',
                    supabaseAnonKey: 'anon-key-123',
                }
            ],
            ai: [
                {
                    id: 'ai-1',
                    profileName: 'Google AI',
                    provider: 'google',
                    isActive: true,
                    apiKey: 'ai-key-123',
                    model: 'gemini-3.8-flash',
                }
            ],
            authentication: [
                {
                    id: 'auth-1',
                    profileName: 'Supabase Auth',
                    provider: 'supabase',
                    isActive: true,
                    googleSso: false,
                }
            ]
        };

        syncConnectionsToEnv(mockConnections);

        const updatedEnv = mockFiles[envLocalPath];
        expect(updatedEnv).toBeDefined();
        expect(updatedEnv).toContain('CUSTOM_VAR="keep_me"');
        expect(updatedEnv).toContain('NEXT_PUBLIC_DATABASE_PROVIDER="supabase"');
        expect(updatedEnv).toContain('NEXT_PUBLIC_DB_PROVIDER="supabase"');
        expect(updatedEnv).toContain('NEXT_PUBLIC_SUPABASE_URL="https://test.supabase.co"');
        expect(updatedEnv).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY="anon-key-123"');
        expect(updatedEnv).toContain('NEXT_PUBLIC_AUTH_PROVIDER="supabase"');
        expect(updatedEnv).toContain('NEXT_PUBLIC_AI_PROVIDER="google"');
        expect(updatedEnv).toContain('AI_DEFAULT_MODEL="gemini-3.8-flash"');
        expect(process.env.NEXT_PUBLIC_DB_PROVIDER).toBe('supabase');
    });

    it('should synchronize active Firebase profile to .env.local when database changes', () => {
        const envLocalPath = path.join(process.cwd(), '.env.local');
        mockFiles[envLocalPath] = 'NEXT_PUBLIC_SUPABASE_URL="https://old.supabase.co"\n';

        const mockConnections = {
            database: [
                {
                    id: 'db-fb',
                    profileName: 'Firebase Staging',
                    provider: 'firebase',
                    isActive: true,
                    projectId: 'my-fb-proj',
                    apiKey: 'fb-api-key',
                    authDomain: 'my-fb-proj.firebaseapp.com',
                }
            ],
            ai: [],
            authentication: [
                {
                    id: 'auth-fb',
                    provider: 'firebase',
                    isActive: true,
                }
            ]
        };

        syncConnectionsToEnv(mockConnections);

        const updatedEnv = mockFiles[envLocalPath];
        expect(updatedEnv).toContain('NEXT_PUBLIC_DATABASE_PROVIDER="firebase"');
        expect(updatedEnv).toContain('NEXT_PUBLIC_DB_PROVIDER="firebase"');
        expect(updatedEnv).toContain('NEXT_PUBLIC_FIREBASE_PROJECT_ID="my-fb-proj"');
        expect(updatedEnv).toContain('NEXT_PUBLIC_FIREBASE_API_KEY="fb-api-key"');
        expect(updatedEnv).toContain('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="my-fb-proj.firebaseapp.com"');
        expect(updatedEnv).toContain('NEXT_PUBLIC_AUTH_PROVIDER="firebase"');
        expect(updatedEnv).toContain('NEXT_PUBLIC_SUPABASE_URL=""');
        expect(process.env.NEXT_PUBLIC_DB_PROVIDER).toBe('firebase');
    });
});
