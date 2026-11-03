import {
  executeLocalTableOperation,
  executeLocalAuthOperation,
  type LocalTablePayload,
} from './local-db-engine';

const isNodeRuntime =
  typeof process !== 'undefined' && Boolean(process.versions && process.versions.node);

async function runTablePayload(payload: LocalTablePayload): Promise<{ data: any; error: any }> {
  if (isNodeRuntime) {
    return executeLocalTableOperation(payload);
  }
  try {
    const res = await fetch('/api/local-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    return await res.json();
  } catch (err: any) {
    return {
      data: null,
      error: { message: err?.message || 'Failed to reach local DB endpoint' },
    };
  }
}

async function runAuthPayload(payload: any): Promise<{ data: any; error: any }> {
  if (isNodeRuntime) {
    return executeLocalAuthOperation(payload);
  }
  try {
    const res = await fetch('/api/local-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    return await res.json();
  } catch (err: any) {
    return {
      data: null,
      error: { message: err?.message || 'Failed to reach local auth endpoint' },
    };
  }
}

class LocalQueryBuilder implements PromiseLike<{ data: any; error: any }> {
  private payload: LocalTablePayload;

  constructor(table: string) {
    this.payload = {
      action: 'select',
      table,
      filters: [],
      orders: [],
    };
  }

  select(columns: string = '*'): this {
    if (this.payload.action === 'select') {
      this.payload.columns = columns;
    }
    return this;
  }

  insert(values: any): this {
    this.payload.action = 'insert';
    this.payload.data = values;
    return this;
  }

  upsert(values: any, options?: { onConflict?: string }): this {
    this.payload.action = 'upsert';
    this.payload.data = values;
    if (options?.onConflict) {
      this.payload.onConflict = options.onConflict;
    }
    return this;
  }

  update(values: any): this {
    this.payload.action = 'update';
    this.payload.data = values;
    return this;
  }

  delete(): this {
    this.payload.action = 'delete';
    return this;
  }

  eq(column: string, value: any): this {
    this.payload.filters!.push({ type: 'eq', column, value });
    return this;
  }

  neq(column: string, value: any): this {
    this.payload.filters!.push({ type: 'neq', column, value });
    return this;
  }

  in(column: string, values: any[]): this {
    this.payload.filters!.push({ type: 'in', column, value: values });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.payload.orders!.push({ column, ascending: options?.ascending !== false });
    return this;
  }

  limit(count: number): this {
    this.payload.limit = count;
    return this;
  }

  single(): this {
    this.payload.single = true;
    return this;
  }

  maybeSingle(): this {
    this.payload.maybeSingle = true;
    return this;
  }

  then<TResult1 = { data: any; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2> {
    return runTablePayload(this.payload).then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null
  ): Promise<{ data: any; error: any } | TResult> {
    return runTablePayload(this.payload).catch(onrejected);
  }
}

function getActiveBrowserUser(): { email?: string; uid?: string } {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('workwayz_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { email: parsed.email, uid: parsed.uid || parsed.empId };
    }
  } catch (_) {}
  return {};
}

export const localSupabaseClient: any = {
  from(table: string) {
    return new LocalQueryBuilder(table);
  },
  channel(_name: string) {
    const ch = {
      on(_type: string, _filter: any, _callback: any) {
        return ch;
      },
      subscribe(_callback?: (status: string) => void) {
        if (typeof _callback === 'function') {
          _callback('SUBSCRIBED');
        }
        return ch;
      },
    };
    return ch;
  },
  removeChannel(_ch: any) {
    return Promise.resolve('ok');
  },
  auth: {
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      return runAuthPayload({ action: 'signInWithPassword', email, password });
    },
    async signUp({ email, password }: { email: string; password: string }) {
      return runAuthPayload({ action: 'signUp', email, password });
    },
    async updateUser(attributes: { password?: string; email?: string }) {
      const activeUser = getActiveBrowserUser();
      return runAuthPayload({
        action: 'updateUser',
        email: attributes.email || activeUser.email,
        userId: activeUser.uid,
        password: attributes.password,
      });
    },
    async signOut() {
      return { error: null };
    },
    async getSession() {
      const activeUser = getActiveBrowserUser();
      if (activeUser.email) {
        return {
          data: {
            session: {
              access_token: `local-session-${activeUser.uid || 'user'}`,
              user: { id: activeUser.uid || 'local-user', email: activeUser.email },
            },
          },
          error: null,
        };
      }
      return { data: { session: null }, error: null };
    },
    admin: {
      async createUser({ email, password }: { email: string; password: string; email_confirm?: boolean }) {
        return runAuthPayload({ action: 'createUser', email, password });
      },
      async listUsers() {
        return runAuthPayload({ action: 'listUsers' });
      },
      async updateUserById(userId: string, attributes: { password?: string; email?: string }) {
        return runAuthPayload({
          action: 'updateUserById',
          userId,
          email: attributes.email,
          password: attributes.password,
        });
      },
    },
  },
};
