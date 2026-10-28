/**
 * One-time migration of browser storage keys from the app's former name (`projectflow_*`)
 * to the current name (`workwayz_*`).
 *
 * Values are moved (never overwriting an already-present new key) and the legacy keys are removed,
 * so existing logins ("remember me") and cached runtime config survive the rename.
 *
 * This module runs the migration as a side effect when first imported. Import it (for its side
 * effect) from any module that reads these keys at load time, before first use.
 */

/** [legacy key, current key] */
export const LEGACY_STORAGE_KEY_MAP: ReadonlyArray<readonly [string, string]> = [
  ['projectflow_user', 'workwayz_user'],
  ['projectflow_last_activity', 'workwayz_last_activity'],
  ['projectflow_db_provider', 'workwayz_db_provider'],
  ['projectflow_firebase_config', 'workwayz_firebase_config'],
  ['projectflow_remember_me', 'workwayz_remember_me'],
];

export function migrateLegacyStorageKeys(): void {
  if (typeof window === 'undefined') return;
  try {
    for (const [legacyKey, newKey] of LEGACY_STORAGE_KEY_MAP) {
      const legacyValue = localStorage.getItem(legacyKey);
      if (legacyValue === null) continue;
      if (localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, legacyValue);
      }
      localStorage.removeItem(legacyKey);
    }
  } catch {}
}

migrateLegacyStorageKeys();

