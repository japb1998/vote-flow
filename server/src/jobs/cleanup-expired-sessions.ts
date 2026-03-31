import { createStore } from '../store';

async function main() {
  const store = createStore();
  await store.initialize();

  try {
    const cleaned = await store.cleanupExpiredSessions();
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired sessions`);
    }
  } finally {
    await store.close();
  }
}

main().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
