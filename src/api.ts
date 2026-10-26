// Client for the SQLite sign-in / score API in server/api.mjs (served by the Vite dev and preview servers).

export interface Session {
  token: string;
  username: string;
}

export interface ScoreSummary {
  games: number;
  best: number | null;
  recent: { score: number; playedAt: string }[];
}

const TOKEN_KEY = 'treasure-hunt-session';

// Calls an /api endpoint. Input: path, HTTP method, optional JSON body and session token. Output: parsed JSON; throws Error with the server's message.
async function request<T>(path: string, method: string, body?: unknown, token?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('Cannot reach the score server. You can still play as a guest.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || data === null) {
    throw Object.assign(new Error(data?.error ?? 'Cannot reach the score server. You can still play as a guest.'), {
      status: response.status,
    });
  }
  return data as T;
}

export const api = {
  signUp: (username: string, password: string) => request<Session>('/api/signup', 'POST', { username, password }),
  signIn: (username: string, password: string) => request<Session>('/api/signin', 'POST', { username, password }),
  signOut: (token: string) => request<{ ok: true }>('/api/signout', 'POST', undefined, token),
  me: (token: string) => request<{ username: string }>('/api/me', 'GET', undefined, token),
  getScores: (token: string) => request<ScoreSummary>('/api/scores', 'GET', undefined, token),
  saveScore: (token: string, score: number) => request<ScoreSummary>('/api/scores', 'POST', { score }, token),
};

// Remembers the session token across page reloads; storage can be unavailable (private mode), so failures are ignored.
export const tokenStore = {
  get: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {}
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
  },
};
