import { SessionStore } from './interface';
import { SqliteSessionStore } from './sqlite';
import { MemorySessionStore } from './memory';

export type StoreType = 'sqlite' | 'memory';

export function createStore(type?: StoreType): SessionStore {
  const storeType = type ?? (process.env.SESSION_STORE as StoreType) ?? 'sqlite';

  switch (storeType) {
    case 'memory':
      console.log('Using in-memory session store');
      return new MemorySessionStore();
    case 'sqlite':
    default:
      console.log(`Using SQLite session store`);
      return new SqliteSessionStore();
  }
}

export { SessionStore } from './interface';
export type { UserInfo } from './interface';
