import { schedule } from 'node-cron';
import { SessionStore } from '../store';

const CLEANUP_SCHEDULE = process.env.CLEANUP_CRON ?? '*/5 * * * *'; // every 5 minutes

export function scheduleCleanup(store: SessionStore) {
  return schedule(CLEANUP_SCHEDULE, async () => {
    try {
      const cleaned = await store.cleanupExpiredSessions();
      if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} expired sessions`);
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  });
}
