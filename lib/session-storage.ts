// Session storage for tutorial data
// In production, replace with Redis, DynamoDB, or another persistent store

export interface FrameData {
  text: string;
  imageUrl?: string;
  audioUrl?: string;
}

export interface SessionData {
  steps: Record<string, string>; // step1: "description...", step2: ...
  frames: FrameData[];
  url: string;
  style: string;
  createdAt: number;
}

// In-memory session store (replace with persistent storage in production)
// Use global variable to persist across Fast Refresh in development
declare global {
  var sessionStore: Map<string, SessionData> | undefined;
}

const sessions = global.sessionStore || new Map<string, SessionData>();

if (typeof window === 'undefined') {
  global.sessionStore = sessions;
}

export function createSession(sessionId: string, data: Partial<SessionData>): void {
  sessions.set(sessionId, {
    steps: data.steps || {},
    frames: data.frames || [],
    url: data.url || '',
    style: data.style || '',
    createdAt: Date.now(),
  });
}

export function getSession(sessionId: string): SessionData | undefined {
  return sessions.get(sessionId);
}

export function updateSession(sessionId: string, data: Partial<SessionData>): void {
  const existing = sessions.get(sessionId);
  if (existing) {
    sessions.set(sessionId, { ...existing, ...data });
  }
}

export function updateFrame(sessionId: string, frameIndex: number, frameData: Partial<FrameData>): void {
  const session = sessions.get(sessionId);
  if (session) {
    if (!session.frames[frameIndex]) {
      session.frames[frameIndex] = { text: '' };
    }
    session.frames[frameIndex] = { ...session.frames[frameIndex], ...frameData };
  }
}

export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

// Cleanup old sessions (older than 24 hours)
export function cleanupOldSessions(): void {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  Array.from(sessions.entries()).forEach(([sessionId, data]) => {
    if (now - data.createdAt > maxAge) {
      sessions.delete(sessionId);
    }
  });
}

// Run cleanup every hour
if (typeof window === 'undefined') {
  setInterval(cleanupOldSessions, 60 * 60 * 1000);
}
