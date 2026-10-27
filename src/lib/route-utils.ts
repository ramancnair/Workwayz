/**
 * Route resolution utilities for Workwayz
 * 
 * Ensures robust route determination across AppLayout, PM sidebar, Project sidebar,
 * and page layouts even when root URL masking ('/') is active.
 */

/**
 * Safely extracts the route pathname from Next.js internal Flight router tree structure
 */
export function extractRouteFromNextTree(tree: any): string | null {
  if (!tree || !Array.isArray(tree)) return null;

  try {
    function walk(node: any): string[] {
      if (!node || !Array.isArray(node)) return [];
      const segment = Array.isArray(node[0]) ? node[0][1] : node[0];
      const segments: string[] = [];
      if (
        typeof segment === 'string' &&
        segment &&
        !segment.startsWith('__PAGE__') &&
        !segment.startsWith('(') &&
        segment !== '__DEFAULT__'
      ) {
        segments.push(segment);
      }
      const children = node[1]?.children;
      if (children) {
        segments.push(...walk(children));
      }
      return segments;
    }
    const segs = walk(tree);
    if (segs.length > 0) {
      return '/' + segs.join('/');
    }
  } catch (_) {}

  return null;
}

/**
 * Resolves the real active route even when URL masking is in effect.
 */
export function getEffectiveRoute(pathname?: string | null): string {
  if (pathname && pathname !== '/' && !pathname.startsWith('/setup-wizard')) {
    return pathname;
  }

  if (typeof window === 'undefined') {
    return pathname || '/';
  }

  // 1. Check custom attribute on current window.history.state
  try {
    const historyState = window.history.state;
    if (
      historyState?.__workwayz_real_route &&
      typeof historyState.__workwayz_real_route === 'string' &&
      historyState.__workwayz_real_route !== '/' &&
      historyState.__workwayz_real_route !== '/login'
    ) {
      return historyState.__workwayz_real_route;
    }

    // 2. Check Next.js internal flight tree in history state
    const treeRoute = extractRouteFromNextTree(historyState?.__PRIVATE_NEXTJS_INTERNALS_TREE?.tree);
    if (treeRoute && treeRoute !== '/' && treeRoute !== '/login') {
      return treeRoute;
    }
  } catch (_) {}

  // 3. Check sessionStorage
  try {
    const sessionRoute = sessionStorage.getItem('workwayz_real_route');
    if (sessionRoute && sessionRoute !== '/' && sessionRoute !== '/login') {
      return sessionRoute;
    }
  } catch (_) {}

  return pathname || '/';
}

