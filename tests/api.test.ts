import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, tokenStore } from '../src/api';

// Stubs fetch with one response. Input: HTTP status and JSON body (or a body that fails to parse). Output: the fetch mock.
function mockFetch(status: number, body: unknown, badJson = false) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: badJson ? () => Promise.reject(new Error('bad json')) : () => Promise.resolve(body),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('api client', () => {
  it('posts credentials as JSON for sign up and sign in', async () => {
    const fetchMock = mockFetch(201, { token: 't', username: 'alice' });
    await expect(api.signUp('alice', 'secret1')).resolves.toEqual({ token: 't', username: 'alice' });
    expect(fetchMock).toHaveBeenCalledWith('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'alice', password: 'secret1' }),
    });
    await api.signIn('alice', 'secret1');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/signin');
  });

  it('sends the bearer token without a body for token-only calls', async () => {
    const fetchMock = mockFetch(200, { ok: true });
    await api.signOut('tok');
    await api.me('tok');
    await api.getScores('tok');
    expect(fetchMock.mock.calls.map((c) => [c[0], c[1].method])).toEqual([
      ['/api/signout', 'POST'],
      ['/api/me', 'GET'],
      ['/api/scores', 'GET'],
    ]);
    expect(fetchMock.mock.calls[0][1]).toEqual({ method: 'POST', headers: { Authorization: 'Bearer tok' }, body: undefined });
  });

  it('sends the score with the token', async () => {
    const fetchMock = mockFetch(201, { games: 1, best: 100, recent: [] });
    await api.saveScore('tok', 100);
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer tok' });
    expect(fetchMock.mock.calls[0][1].body).toBe('{"score":100}');
  });

  it('throws the server error message with the status', async () => {
    mockFetch(401, { error: 'Please sign in again' });
    await expect(api.me('tok')).rejects.toMatchObject({ message: 'Please sign in again', status: 401 });
  });

  it('throws a friendly message when the server is unreachable or replies without JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(api.me('tok')).rejects.toThrow(/Cannot reach the score server/);

    mockFetch(404, null, true);
    await expect(api.me('tok')).rejects.toMatchObject({ message: expect.stringMatching(/Cannot reach/), status: 404 });

    mockFetch(500, {});
    await expect(api.me('tok')).rejects.toMatchObject({ message: expect.stringMatching(/Cannot reach/), status: 500 });
  });
});

describe('tokenStore', () => {
  it('stores, reads and clears the token', () => {
    expect(tokenStore.get()).toBeNull();
    tokenStore.set('abc');
    expect(tokenStore.get()).toBe('abc');
    tokenStore.clear();
    expect(tokenStore.get()).toBeNull();
  });

  it('ignores storage errors', () => {
    const fail = () => {
      throw new Error('blocked');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(fail);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(fail);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(fail);
    expect(tokenStore.get()).toBeNull();
    expect(() => tokenStore.set('x')).not.toThrow();
    expect(() => tokenStore.clear()).not.toThrow();
  });
});
