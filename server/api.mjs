// SQLite-backed sign-up / sign-in / score API, mounted into the Vite dev and preview servers by vite.config.ts.
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 200;
const SESSION_DAYS = 30;
const RECENT_SCORES_LIMIT = 10;
// Lowest and highest final scores a 3-box game can produce (3 skeletons / treasure first).
const MIN_SCORE = -150;
const MAX_SCORE = 100;
const MAX_BODY_BYTES = 10_000;

const SCHEMA = `
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  CREATE TABLE IF NOT EXISTS scores (
    id        INTEGER PRIMARY KEY,
    user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score     INTEGER NOT NULL,
    played_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  CREATE INDEX IF NOT EXISTS scores_by_user ON scores(user_id, id);
`;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Hashes a password with a random salt. Input: plain password. Output: "saltHex:hashHex".
function hashPassword(password) {
  const salt = randomBytes(16);
  return `${salt.toString('hex')}:${scryptSync(password, salt, 64).toString('hex')}`;
}

// Checks a password against a stored hash. Input: plain password, "saltHex:hashHex". Output: true if they match.
function verifyPassword(password, stored) {
  const [saltHex, hashHex] = stored.split(':');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(actual, expected);
}

// Session tokens are stored hashed so a leaked database file cannot be used to sign in. Input: token. Output: sha256 hex.
function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

// Reads and parses a JSON request body. Input: Node request. Output: parsed object ({} when the body is empty).
async function readJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > MAX_BODY_BYTES) throw new HttpError(413, 'Request body too large');
  }
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}

// Writes a JSON response. Input: Node response, HTTP status, data to serialize. Output: none.
function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

// Pulls username/password out of a request body. Input: parsed body. Output: { username, password } as strings.
function readCredentials(body) {
  return {
    username: typeof body.username === 'string' ? body.username.trim() : '',
    password: typeof body.password === 'string' ? body.password : '',
  };
}

// Opens (and creates if needed) the SQLite database and returns a Connect-style middleware serving /api/*.
// Input: { dbPath } path of the database file. Output: (req, res, next) middleware.
export function createApiHandler({ dbPath = 'data/treasure.db' } = {}) {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(SCHEMA);

  const sql = {
    findUser: db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?'),
    insertUser: db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)'),
    insertSession: db.prepare('INSERT INTO sessions (token_hash, user_id) VALUES (?, ?)'),
    findSessionUser: db.prepare(`
      SELECT users.id, users.username FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ? AND sessions.created_at > ?`),
    deleteSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
    insertScore: db.prepare('INSERT INTO scores (user_id, score) VALUES (?, ?)'),
    scoreStats: db.prepare('SELECT COUNT(*) AS games, MAX(score) AS best FROM scores WHERE user_id = ?'),
    recentScores: db.prepare(
      'SELECT score, played_at AS playedAt FROM scores WHERE user_id = ? ORDER BY id DESC LIMIT ?',
    ),
  };

  // Creates a session for a user. Input: { id, username }. Output: { token, username } sent to the client.
  function startSession(user) {
    const token = randomBytes(32).toString('hex');
    sql.insertSession.run(hashToken(token), user.id);
    return { token, username: user.username };
  }

  // Resolves the signed-in user from the Bearer token. Input: request. Output: { id, username, tokenHash }; throws 401.
  function requireUser(req) {
    const match = /^Bearer ([0-9a-f]+)$/.exec(req.headers.authorization ?? '');
    const tokenHash = match ? hashToken(match[1]) : null;
    const cutoff = new Date(Date.now() - SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const user = tokenHash && sql.findSessionUser.get(tokenHash, cutoff);
    if (!user) throw new HttpError(401, 'Please sign in again');
    return { ...user, tokenHash };
  }

  // Summarizes a user's games. Input: user id. Output: { games, best, recent: [{ score, playedAt }] }.
  function scoreSummary(userId) {
    const { games, best } = sql.scoreStats.get(userId);
    return { games, best, recent: sql.recentScores.all(userId, RECENT_SCORES_LIMIT) };
  }

  const routes = {
    'POST /api/signup': async (req) => {
      const { username, password } = readCredentials(await readJson(req));
      if (!USERNAME_PATTERN.test(username)) {
        throw new HttpError(400, 'Username must be 3-20 letters, numbers or underscores');
      }
      if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
        throw new HttpError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      }
      if (sql.findUser.get(username)) throw new HttpError(409, 'That username is already taken');
      const { lastInsertRowid } = sql.insertUser.run(username, hashPassword(password));
      return [201, startSession({ id: lastInsertRowid, username })];
    },
    'POST /api/signin': async (req) => {
      const { username, password } = readCredentials(await readJson(req));
      const user = username && sql.findUser.get(username);
      if (!user || !password || !verifyPassword(password, user.password_hash)) {
        throw new HttpError(401, 'Wrong username or password');
      }
      return [200, startSession(user)];
    },
    'POST /api/signout': async (req) => {
      sql.deleteSession.run(requireUser(req).tokenHash);
      return [200, { ok: true }];
    },
    'GET /api/me': async (req) => [200, { username: requireUser(req).username }],
    'GET /api/scores': async (req) => [200, scoreSummary(requireUser(req).id)],
    'POST /api/scores': async (req) => {
      const user = requireUser(req);
      const { score } = await readJson(req);
      if (!Number.isInteger(score) || score < MIN_SCORE || score > MAX_SCORE) {
        throw new HttpError(400, 'Invalid score');
      }
      sql.insertScore.run(user.id, score);
      return [201, scoreSummary(user.id)];
    },
  };

  return async (req, res, next) => {
    const path = (req.url ?? '').split('?')[0];
    if (!path.startsWith('/api/')) return next();
    try {
      const route = routes[`${req.method} ${path}`];
      if (!route) throw new HttpError(404, 'Not found');
      const [status, data] = await route(req);
      sendJson(res, status, data);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      if (status === 500) console.error('[api]', error);
      sendJson(res, status, { error: status === 500 ? 'Server error' : error.message });
    }
  };
}
