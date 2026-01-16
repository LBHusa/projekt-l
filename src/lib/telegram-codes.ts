/**
 * Telegram Connection Codes Store
 * Temporary storage for connection codes (in production, use Redis)
 */

// In-memory store for connection codes
// Format: { code: { createdAt, userId } }
const connectionCodes = new Map<string, { createdAt: number; userId: string }>();

const TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Clean up expired codes
 */
function cleanupExpiredCodes() {
  const now = Date.now();

  for (const [code, data] of connectionCodes.entries()) {
    if (now - data.createdAt > TTL) {
      connectionCodes.delete(code);
    }
  }
}

/**
 * Store a connection code
 */
export function storeConnectionCode(code: string, userId: string) {
  cleanupExpiredCodes();
  connectionCodes.set(code, { createdAt: Date.now(), userId });
}

/**
 * Get and consume a connection code
 */
export function consumeConnectionCode(code: string): string | null {
  cleanupExpiredCodes();
  const data = connectionCodes.get(code);
  if (data) {
    connectionCodes.delete(code);
    return data.userId;
  }
  return null;
}

/**
 * Generate a 6-character alphanumeric code
 */
export function generateConnectionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
