import { randomUUID } from "crypto";

const SESSION_COOKIE_NAME = "session_id";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

interface Session {
  sessionId: string;
  username: string;
  expiresAt: number;
}

// In-memory session store (in production, consider using Redis or database)
const sessions = new Map<string, Session>();

export function createSession(username: string): string {
  const sessionId = randomUUID();
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  
  sessions.set(sessionId, {
    sessionId,
    username,
    expiresAt,
  });

  // Clean up expired sessions periodically
  cleanupExpiredSessions();

  return sessionId;
}

export function getSession(sessionId: string): Session | null {
  const session = sessions.get(sessionId);
  
  if (!session) {
    return null;
  }

  // Check if session is expired
  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }

  return session;
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

export function getSessionFromRequest(req: Request): Session | null {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  const cookies = parseCookies(cookieHeader);
  const sessionId = cookies[SESSION_COOKIE_NAME];
  
  if (!sessionId) {
    return null;
  }

  return getSession(sessionId);
}

export function createSessionCookie(sessionId: string): string {
  const expires = new Date(Date.now() + SESSION_DURATION_MS);
  return `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires.toUTCString()}`;
}

export function deleteSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  const pairs = cookieHeader.split(";");

  for (const pair of pairs) {
    const [key, value] = pair.trim().split("=");
    if (key && value) {
      cookies[key] = decodeURIComponent(value);
    }
  }

  return cookies;
}

function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(sessionId);
    }
  }
}

