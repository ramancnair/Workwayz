import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { extractRouteFromNextTree, getEffectiveRoute } from '../route-utils';

describe('Route Resolution Utilities (route-utils.ts)', () => {
  const originalWindow = global.window;

  beforeEach(() => {
    // Reset window.history and sessionStorage mocks
    (global as any).window = {
      history: {
        state: null,
      },
    };
    (global as any).sessionStorage = {
      _store: {} as Record<string, string>,
      getItem(key: string) {
        return this._store[key] || null;
      },
      setItem(key: string, val: string) {
        this._store[key] = val;
      },
      removeItem(key: string) {
        delete this._store[key];
      },
      clear() {
        this._store = {};
      },
    };
  });

  afterEach(() => {
    (global as any).window = originalWindow;
  });

  describe('extractRouteFromNextTree', () => {
    it('returns null for empty or invalid tree', () => {
      expect(extractRouteFromNextTree(null)).toBeNull();
      expect(extractRouteFromNextTree(undefined)).toBeNull();
      expect(extractRouteFromNextTree({})).toBeNull();
      expect(extractRouteFromNextTree([])).toBeNull();
    });

    it('extracts top-level route from Next.js tree', () => {
      const tree = ['', { children: ['(app)', { children: ['billing', { children: ['', {}] }] }] }];
      expect(extractRouteFromNextTree(tree)).toBe('/billing');
    });

    it('extracts nested portfolio routes ignoring route groups', () => {
      const tree = [
        '',
        {
          children: [
            '(app)',
            {
              children: [
                'portfolio-settings',
                {
                  children: ['access-settings', { children: ['', {}] }],
                },
              ],
            },
          ],
        },
      ];
      expect(extractRouteFromNextTree(tree)).toBe('/portfolio-settings/access-settings');
    });

    it('extracts dynamic project routes correctly', () => {
      const tree = [
        '',
        {
          children: [
            '(app)',
            {
              children: [
                'projects',
                {
                  children: [
                    ['projectId', 'P2600002', 'd'],
                    {
                      children: [
                        'pmo',
                        {
                          children: ['tnm-billing', { children: ['', {}] }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];
      expect(extractRouteFromNextTree(tree)).toBe('/projects/P2600002/pmo/tnm-billing');
    });
  });

  describe('getEffectiveRoute', () => {
    it('returns pathname immediately when not masked to root', () => {
      expect(getEffectiveRoute('/billing')).toBe('/billing');
      expect(getEffectiveRoute('/quality/estimations')).toBe('/quality/estimations');
    });

    it('resolves from history state __workwayz_real_route when pathname is /', () => {
      (window.history as any).state = {
        __workwayz_real_route: '/billing',
      };
      expect(getEffectiveRoute('/')).toBe('/billing');
    });

    it('resolves from FlightRouterState tree in history state when __workwayz_real_route is missing', () => {
      (window.history as any).state = {
        __PRIVATE_NEXTJS_INTERNALS_TREE: {
          tree: ['', { children: ['(app)', { children: ['billing', { children: ['', {}] }] }] }],
        },
      };
      expect(getEffectiveRoute('/')).toBe('/billing');
    });

    it('resolves from sessionStorage when history state has no route', () => {
      sessionStorage.setItem('workwayz_real_route', '/quality/estimations');
      expect(getEffectiveRoute('/')).toBe('/quality/estimations');
    });

    it('falls back to provided pathname or / when nothing else is found', () => {
      expect(getEffectiveRoute('/')).toBe('/');
      expect(getEffectiveRoute(null)).toBe('/');
    });
  });
});

