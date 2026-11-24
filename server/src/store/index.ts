import { SessionStore } from './interface';
import { MemorySessionStore } from './memory';

export type StoreType = 'sqlite' | 'memory';

export function createStore(type?: StoreType): SessionStore {
  const storeType = type ?? (process.env.SESSION_STORE as StoreType) ?? 'sqlite';

  switch (storeType) {
    case 'memory':
      console.log('Using in-memory session store');
      return new MemorySessionStore();
    case 'sqlite':
    default: {
      console.log('Using SQLite session store');
      // Lazy-load sqlite store so SESSION_STORE=memory works without sqlite3 native bindings
      const { SqliteSessionStore } = require('./sqlite') as typeof import('./sqlite');
      return new SqliteSessionStore();
    }
  }
}

export { SessionStore } from './interface';
export type { UserInfo } from './interface';
