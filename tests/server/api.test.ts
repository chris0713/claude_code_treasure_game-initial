// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApiHandler } from '../../server/api.mjs';

type Result = { status: number; body: any; nextCalled: boolean };

const dir = mkdtempSync(join(tmpdir(), 'treasure-api-'));
let handler: ReturnType<typeof createApiHandler>;

// Sends a fake Connect request through the handler. Input: method, url, raw body or object, token. Output: status and parsed JSON.
async function call(method: string, url: string | undefined, body?: unknown, token?: string): Promise<Result> {
  const raw = body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body);
  const req = {
    method,
    url,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    async *[Symbol.asyncIterator]() {
      if (raw) yield raw;
    },
  };
  const result: Result = { status: 0, body: undefined, nextCalled: false };
  const res = {
    statusCode: 0,
    setHeader: vi.fn(),
    end(text: string) {
      result.status = this.statusCode;
      result.body = JSON.parse(text);
    },
  };
  await handler(req, res, () => {
    result.nextCalled = true;
  });
  return result;
}

beforeAll(() => {
  handler = createApiHandler({ dbPath: join(dir, 'nested', 'test.db') });
});

afterAll(() => {
  // Windows keeps the open database locked until the worker exits; leave the temp folder for the OS then.
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {}
});

describe('server api', () => {
  it('passes non-API requests to the next middleware', async () => {
    expect((await call('GET', '/index.html')).nextCalled).toBe(true);
    expect((await call('GET', undefined)).nextCalled).toBe(true);
  });

  it('returns 404 for unknown API routes', async () => {
    expect(await call('GET', '/api/nope?x=1')).toMatchObject({ status: 404, body: { error: 'Not found' } });
  });

  it('validates sign-up input', async () => {
    expect((await call('POST', '/api/signup', { username: 'a', password: 'secret1' })).status).toBe(400);
    expect((await call('POST', '/api/signup', { username: 'alice', password: '123' })).body.error).toMatch(/at least 6/);
    expect((await call('POST', '/api/signup', { username: 'alice', password: 'x'.repeat(201) })).status).toBe(400);
    expect((await call('POST', '/api/signup', { username: 42, password: 42 })).status).toBe(400);
    expect((await call('POST', '/api/signup')).status).toBe(400);
  });

  it('rejects bad request bodies', async () => {
    expect(await call('POST', '/api/signup', '{nope')).toMatchObject({ status: 400, body: { error: 'Invalid JSON' } });
    expect((await call('POST', '/api/signup', 'x'.repeat(10_001))).status).toBe(413);
  });

  it('hides unexpected errors behind a 500', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await call('POST', '/api/signup', 'null')).toMatchObject({ status: 500, body: { error: 'Server error' } });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('signs up, signs in, saves scores and signs out', async () => {
    const signup = await call('POST', '/api/signup', { username: ' alice ', password: 'secret1' });
    expect(signup).toMatchObject({ status: 201, body: { username: 'alice' } });
    expect(signup.body.token).toMatch(/^[0-9a-f]{64}$/);

    expect((await call('POST', '/api/signup', { username: 'ALICE', password: 'secret1' })).status).toBe(409);

    expect((await call('POST', '/api/signin', { username: 'alice', password: 'wrong!!' })).status).toBe(401);
    expect((await call('POST', '/api/signin', { username: 'bob', password: 'secret1' })).status).toBe(401);
    expect((await call('POST', '/api/signin', { username: 'alice' })).status).toBe(401);
    expect((await call('POST', '/api/signin', {})).status).toBe(401);

    const signin = await call('POST', '/api/signin', { username: 'alice', password: 'secret1' });
    expect(signin.status).toBe(200);
    const token = signin.body.token;

    expect(await call('GET', '/api/me', undefined, token)).toMatchObject({ status: 200, body: { username: 'alice' } });
    expect(await call('GET', '/api/scores', undefined, token)).toMatchObject({
      status: 200,
      body: { games: 0, best: null, recent: [] },
    });

    expect((await call('POST', '/api/scores', { score: 1.5 }, token)).status).toBe(400);
    expect((await call('POST', '/api/scores', { score: -200 }, token)).status).toBe(400);
    expect((await call('POST', '/api/scores', { score: 101 }, token)).status).toBe(400);
    await call('POST', '/api/scores', { score: -50 }, token);
    const saved = await call('POST', '/api/scores', { score: 100 }, token);
    expect(saved.status).toBe(201);
    expect(saved.body).toMatchObject({ games: 2, best: 100 });
    expect(saved.body.recent.map((g: { score: number }) => g.score)).toEqual([100, -50]);

    expect(await call('POST', '/api/signout', undefined, token)).toMatchObject({ status: 200, body: { ok: true } });
    expect((await call('GET', '/api/me', undefined, token)).status).toBe(401);
  });

  it('requires a valid bearer token', async () => {
    expect(await call('GET', '/api/me')).toMatchObject({ status: 401, body: { error: 'Please sign in again' } });
    expect((await call('GET', '/api/scores', undefined, 'not-hex')).status).toBe(401);
    expect((await call('GET', '/api/scores', undefined, 'abc123')).status).toBe(401);
  });
});
