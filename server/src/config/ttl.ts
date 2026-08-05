/** TTL applied to a session when it is created. */
export const ACTIVE_SESSION_TTL =
  parseInt(process.env.ACTIVE_SESSION_TTL ?? '', 10) || 24 * 60 * 60 * 1000; // 24 hours

/** TTL applied to a session when its creator closes it. */
export const CLOSED_SESSION_TTL =
  parseInt(process.env.CLOSED_SESSION_TTL ?? '', 10) || 30 * 60 * 1000; // 30 minutes
