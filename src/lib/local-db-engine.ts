import { getDataDirectory } from './config-paths';

const getNodeModules = () => {
  const req = eval('require');
  return {
    fs: req('fs') as typeof import('fs'),
    path: req('path') as typeof import('path'),
    crypto: req('crypto') as typeof import('crypto'),
  };
};

export interface LocalAuthUser {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  created_at: string;
  updated_at: string;
}

export interface LocalDatabaseStore {
  version: number;
  auth_users: LocalAuthUser[];
  tables: Record<string, Record<string, any>[]>;
}

export interface LocalQueryFilter {
  type: 'eq' | 'neq' | 'in';
  column: string;
  value: any;
}

export interface LocalQueryOrder {
  column: string;
  ascending?: boolean;
}

export interface LocalTablePayload {
  action: 'select' | 'insert' | 'upsert' | 'update' | 'delete';
  table: string;
  columns?: string;
  data?: any;
  filters?: LocalQueryFilter[];
  orders?: LocalQueryOrder[];
  limit?: number;
  single?: boolean;
  maybeSingle?: boolean;
  onConflict?: string;
}

export function getLocalDbFilePath(): string {
  const { fs, path } = getNodeModules();
  const dir = getDataDirectory() || process.cwd();
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (_) {}
  return path.join(dir, 'workwayz-local-db.json');
}

export function resetLocalDbStore(): void {
  const { fs } = getNodeModules();
  const filePath = getLocalDbFilePath();
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (_) {}
}

export function createEmptyStore(): LocalDatabaseStore {
  return {
    version: 1,
    auth_users: [],
    tables: {},
  };
}

export function readLocalDbStore(): LocalDatabaseStore {
  const { fs } = getNodeModules();
  const filePath = getLocalDbFilePath();
  if (!fs.existsSync(filePath)) {
    return createEmptyStore();
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      version: parsed.version || 1,
      auth_users: Array.isArray(parsed.auth_users) ? parsed.auth_users : [],
      tables: parsed.tables && typeof parsed.tables === 'object' ? parsed.tables : {},
    };
  } catch (err) {
    console.warn('[local-db-engine] Failed to parse local DB file, initializing fresh store:', err);
    return createEmptyStore();
  }
}

export function writeLocalDbStore(store: LocalDatabaseStore): void {
  const { fs, path } = getNodeModules();
  const filePath = getLocalDbFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(store, null, 2), 'utf8');
}

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const { crypto } = getNodeModules();
  const effectiveSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, effectiveSalt, 64).toString('hex');
  return { hash, salt: effectiveSalt };
}

function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  try {
    const { crypto } = getNodeModules();
    const { hash } = hashPassword(password, salt);
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(storedHash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function matchesFilters(row: Record<string, any>, filters?: LocalQueryFilter[]): boolean {
  if (!filters || filters.length === 0) return true;
  for (const f of filters) {
    const rowVal = row[f.column];
    if (f.type === 'eq') {
      if (rowVal !== f.value) return false;
    } else if (f.type === 'neq') {
      if (rowVal === f.value) return false;
    } else if (f.type === 'in') {
      if (!Array.isArray(f.value) || !f.value.includes(rowVal)) return false;
    }
  }
  return true;
}

export function executeLocalTableOperation(payload: LocalTablePayload): { data: any; error: any } {
  try {
    const { crypto } = getNodeModules();
    const store = readLocalDbStore();
    const {
      action,
      table,
      data,
      filters = [],
      orders = [],
      limit,
      single,
      maybeSingle,
      onConflict = 'id',
    } = payload;

    if (!store.tables[table]) {
      store.tables[table] = [];
    }
    let tableRows = store.tables[table];

    if (action === 'select') {
      let matched = tableRows.filter((r) => matchesFilters(r, filters));

      if (orders && orders.length > 0) {
        matched = [...matched].sort((a, b) => {
          for (const ord of orders) {
            const va = a[ord.column];
            const vb = b[ord.column];
            if (va === vb) continue;
            const asc = ord.ascending !== false;
            if (va === undefined || va === null) return asc ? 1 : -1;
            if (vb === undefined || vb === null) return asc ? -1 : 1;
            if (va < vb) return asc ? -1 : 1;
            if (va > vb) return asc ? 1 : -1;
          }
          return 0;
        });
      }

      if (typeof limit === 'number' && limit >= 0) {
        matched = matched.slice(0, limit);
      }

      if (single) {
        if (matched.length === 0) {
          return {
            data: null,
            error: {
              code: 'PGRST116',
              message: 'JSON object requested, multiple (or no) rows returned',
            },
          };
        }
        return { data: matched[0], error: null };
      }

      if (maybeSingle) {
        return { data: matched.length > 0 ? matched[0] : null, error: null };
      }

      return { data: matched, error: null };
    }

    if (action === 'insert') {
      const items = Array.isArray(data) ? data : [data];
      const inserted: any[] = [];
      const now = new Date().toISOString();

      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        const row = {
          ...item,
          id: item.id || crypto.randomUUID(),
          created_at: item.created_at || item.createdAt || now,
        };
        const existingIdx = tableRows.findIndex((r) => r.id === row.id);
        if (existingIdx >= 0) {
          tableRows[existingIdx] = { ...tableRows[existingIdx], ...row };
          inserted.push(tableRows[existingIdx]);
        } else {
          tableRows.push(row);
          inserted.push(row);
        }
      }

      writeLocalDbStore(store);
      if (single || maybeSingle) {
        return { data: inserted[0] || null, error: null };
      }
      return { data: inserted, error: null };
    }

    if (action === 'upsert') {
      const items = Array.isArray(data) ? data : [data];
      const upserted: any[] = [];
      const now = new Date().toISOString();
      const conflictKey = onConflict || 'id';

      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        const keyVal = item[conflictKey] || item.id || crypto.randomUUID();
        const existingIdx = tableRows.findIndex((r) => r[conflictKey] === keyVal);
        if (existingIdx >= 0) {
          tableRows[existingIdx] = {
            ...tableRows[existingIdx],
            ...item,
            [conflictKey]: keyVal,
          };
          upserted.push(tableRows[existingIdx]);
        } else {
          const row = {
            ...item,
            id: item.id || keyVal,
            [conflictKey]: keyVal,
            created_at: item.created_at || item.createdAt || now,
          };
          tableRows.push(row);
          upserted.push(row);
        }
      }

      writeLocalDbStore(store);
      if (single || maybeSingle) {
        return { data: upserted[0] || null, error: null };
      }
      return { data: upserted, error: null };
    }

    if (action === 'update') {
      const updated: any[] = [];
      for (let i = 0; i < tableRows.length; i++) {
        if (matchesFilters(tableRows[i], filters)) {
          tableRows[i] = { ...tableRows[i], ...data };
          updated.push(tableRows[i]);
        }
      }
      writeLocalDbStore(store);
      if (single || maybeSingle) {
        return { data: updated[0] || null, error: null };
      }
      return { data: updated, error: null };
    }

    if (action === 'delete') {
      const remaining: any[] = [];
      const deleted: any[] = [];
      for (const row of tableRows) {
        if (matchesFilters(row, filters)) {
          deleted.push(row);
        } else {
          remaining.push(row);
        }
      }
      store.tables[table] = remaining;
      writeLocalDbStore(store);
      return { data: deleted, error: null };
    }

    return { data: null, error: { message: `Unsupported action: ${action}` } };
  } catch (err: any) {
    return {
      data: null,
      error: { message: err?.message || 'Local database error', code: 'LOCAL_DB_ERR' },
    };
  }
}

export function executeLocalAuthOperation(payload: {
  action: 'signInWithPassword' | 'signUp' | 'createUser' | 'updateUser' | 'updateUserById' | 'listUsers';
  email?: string;
  password?: string;
  userId?: string;
}): { data: any; error: any } {
  try {
    const { crypto } = getNodeModules();
    const store = readLocalDbStore();
    const { action, email, password, userId } = payload;
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (action === 'signInWithPassword') {
      if (!normalizedEmail || !password) {
        return {
          data: { user: null, session: null },
          error: { message: 'Email and password are required', status: 400 },
        };
      }
      const user = store.auth_users.find((u) => u.email.toLowerCase() === normalizedEmail);
      if (!user || !verifyPassword(password, user.passwordHash, user.salt)) {
        return {
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials', status: 400 },
        };
      }
      const publicUser = { id: user.id, email: user.email, created_at: user.created_at };
      return {
        data: {
          user: publicUser,
          session: {
            access_token: `local-session-${user.id}`,
            user: publicUser,
          },
        },
        error: null,
      };
    }

    if (action === 'signUp' || action === 'createUser') {
      if (!normalizedEmail || !password) {
        return {
          data: { user: null },
          error: { message: 'Email and password are required', status: 400 },
        };
      }
      const existing = store.auth_users.find((u) => u.email.toLowerCase() === normalizedEmail);
      if (existing) {
        return {
          data: { user: null },
          error: { message: 'User already registered', status: 422 },
        };
      }
      const now = new Date().toISOString();
      const { hash, salt } = hashPassword(password);
      const newUser: LocalAuthUser = {
        id: crypto.randomUUID(),
        email: email!.trim(),
        passwordHash: hash,
        salt,
        created_at: now,
        updated_at: now,
      };
      store.auth_users.push(newUser);
      writeLocalDbStore(store);

      const publicUser = { id: newUser.id, email: newUser.email, created_at: newUser.created_at };
      return {
        data: {
          user: publicUser,
          session: {
            access_token: `local-session-${newUser.id}`,
            user: publicUser,
          },
        },
        error: null,
      };
    }

    if (action === 'updateUser' || action === 'updateUserById') {
      let targetIdx = -1;
      if (userId) {
        targetIdx = store.auth_users.findIndex((u) => u.id === userId);
      }
      if (targetIdx === -1 && normalizedEmail) {
        targetIdx = store.auth_users.findIndex((u) => u.email.toLowerCase() === normalizedEmail);
      }
      // If only 1 user exists in local mode and no userId/email was passed from client updateUser({ password })
      if (targetIdx === -1 && !userId && !normalizedEmail && store.auth_users.length > 0) {
        targetIdx = 0;
      }

      if (targetIdx === -1) {
        return {
          data: { user: null },
          error: { message: 'User not found in local auth store', status: 404 },
        };
      }

      if (password) {
        const { hash, salt } = hashPassword(password);
        store.auth_users[targetIdx].passwordHash = hash;
        store.auth_users[targetIdx].salt = salt;
      }
      if (email) {
        store.auth_users[targetIdx].email = email.trim();
      }
      store.auth_users[targetIdx].updated_at = new Date().toISOString();
      writeLocalDbStore(store);

      const updated = store.auth_users[targetIdx];
      return {
        data: { user: { id: updated.id, email: updated.email } },
        error: null,
      };
    }

    if (action === 'listUsers') {
      const users = store.auth_users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        updated_at: u.updated_at,
      }));
      return { data: { users }, error: null };
    }

    return { data: null, error: { message: `Unsupported auth action: ${action}` } };
  } catch (err: any) {
    return {
      data: null,
      error: { message: err?.message || 'Local auth error' },
    };
  }
}
