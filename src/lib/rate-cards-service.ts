import { db, doc, getDoc, setDoc, onSnapshot } from '@/lib/db-provider';
import type { RateCardItem, RateCardRoleCategory } from '@/types';

export const RATE_CARDS_STORAGE_KEY = 'workwayz_rate_cards';

export const STANDARD_TECH_ROLES = [
  'Software Engineer / Developer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Mobile App Developer',
  'Cloud / DevOps Engineer',
  'Solution Architect',
  'Data Engineer / DBA',
  'Security Engineer',
  'Technical Lead',
  'QA Engineer / SDET',
];

export const STANDARD_HORIZONTAL_ROLES = [
  'Project Management',
  'Business Analysis',
  'Testing / Quality Assurance',
  'Technical Architecture',
  'UI/UX Design',
  'Compliance & Governance',
];

/**
 * Helper to fetch local cached rate cards from localStorage.
 */
export function getLocalCachedRateCards(): RateCardItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RATE_CARDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Helper to save rate cards to localStorage cache.
 */
export function setLocalCachedRateCards(items: RateCardItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RATE_CARDS_STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

/**
 * Clean data for storage to avoid undefined properties.
 */
export function sanitizeRateCardItem(item: any): RateCardItem {
  return {
    id: String(item.id || ''),
    roleName: String(item.roleName || '').trim(),
    category: (item.category === 'Horizontal' ? 'Horizontal' : 'Tech') as RateCardRoleCategory,
    lowRate: Number(item.lowRate) || 0,
    mediumRate: Number(item.mediumRate) || 0,
    highRate: Number(item.highRate) || 0,
    currency: item.currency || 'USD',
    notes: item.notes || '',
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
  };
}

/**
 * Load all rate card items.
 * Starts with empty table if no rate cards have been configured yet.
 */
export async function loadRateCards(): Promise<RateCardItem[]> {
  const localItems = getLocalCachedRateCards();
  if (!db) return localItems;

  try {
    const targetDoc = doc(db, 'settings', 'rate_cards');
    if (!targetDoc) return localItems;

    const snap = await getDoc(targetDoc);
    if (snap && (typeof snap.exists === 'function' ? snap.exists() : snap.data)) {
      const raw = typeof snap.data === 'function' ? snap.data() : snap.data;
      const rawList = Array.isArray(raw?.items)
        ? raw.items
        : Array.isArray(raw?.data?.items)
        ? raw.data.items
        : [];
      const items = rawList.map(sanitizeRateCardItem);
      setLocalCachedRateCards(items);
      return items;
    }
  } catch (err) {
    console.warn('[rate-cards-service] Failed to load rate cards from db:', err);
  }

  return localItems;
}

const localSubscribers = new Set<(items: RateCardItem[]) => void>();

function notifyLocalSubscribers(items: RateCardItem[]) {
  localSubscribers.forEach((cb) => {
    try {
      cb(items);
    } catch {}
  });
}

/**
 * Subscribe to real-time rate card updates.
 */
export function subscribeRateCards(callback: (items: RateCardItem[]) => void): () => void {
  localSubscribers.add(callback);

  // Fire callback with cached items asynchronously to avoid React effect cascading render warnings
  if (typeof window !== 'undefined') {
    queueMicrotask(() => {
      callback(getLocalCachedRateCards());
    });
  }

  if (!db) {
    return () => {
      localSubscribers.delete(callback);
    };
  }

  try {
    const targetDoc = doc(db, 'settings', 'rate_cards');
    if (!targetDoc) {
      return () => {
        localSubscribers.delete(callback);
      };
    }

    const unsub = onSnapshot(
      targetDoc,
      (snap: any) => {
        try {
          if (snap && (typeof snap.exists === 'function' ? snap.exists() : snap.data)) {
            const raw = typeof snap.data === 'function' ? snap.data() : snap.data;
            const rawList = Array.isArray(raw?.items)
              ? raw.items
              : Array.isArray(raw?.data?.items)
              ? raw.data.items
              : [];
            const items = rawList.map(sanitizeRateCardItem);
            setLocalCachedRateCards(items);
            notifyLocalSubscribers(items);
          }
        } catch {
          notifyLocalSubscribers(getLocalCachedRateCards());
        }
      },
      (err: any) => {
        console.warn('[rate-cards-service] Listener error:', err?.message || err);
      }
    );

    return () => {
      localSubscribers.delete(callback);
      if (typeof unsub === 'function') unsub();
    };
  } catch {
    return () => {
      localSubscribers.delete(callback);
    };
  }
}

/**
 * Create or update a rate card entry.
 */
export async function saveRateCard(
  input: Omit<RateCardItem, 'id'> & { id?: string }
): Promise<RateCardItem> {
  const current = await loadRateCards();
  const id = input.id || `rc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newItem: RateCardItem = sanitizeRateCardItem({
    ...input,
    id,
    updatedAt: now,
    createdAt: input.createdAt || now,
  });

  const existingIndex = current.findIndex((item) => item.id === id);
  let updatedList: RateCardItem[];
  if (existingIndex >= 0) {
    updatedList = [...current];
    updatedList[existingIndex] = newItem;
  } else {
    updatedList = [...current, newItem];
  }

  setLocalCachedRateCards(updatedList);
  notifyLocalSubscribers(updatedList);

  if (db) {
    try {
      const targetDoc = doc(db, 'settings', 'rate_cards');
      if (targetDoc) {
        await setDoc(targetDoc, {
          id: 'rate_cards',
          items: updatedList,
          data: { items: updatedList },
          updatedAt: now,
        });
      }
    } catch (err) {
      console.error('[rate-cards-service] Failed to persist rate card to db:', err);
    }
  }

  return newItem;
}

/**
 * Delete a rate card entry by ID.
 */
export async function deleteRateCard(id: string): Promise<void> {
  const current = await loadRateCards();
  const updatedList = current.filter((item) => item.id !== id);

  setLocalCachedRateCards(updatedList);
  notifyLocalSubscribers(updatedList);

  if (db) {
    try {
      const targetDoc = doc(db, 'settings', 'rate_cards');
      if (targetDoc) {
        await setDoc(targetDoc, {
          id: 'rate_cards',
          items: updatedList,
          data: { items: updatedList },
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('[rate-cards-service] Failed to persist deletion to db:', err);
    }
  }
}
