import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { api, tokenStore } from '../src/api';

const played: string[] = [];

beforeEach(() => {
  played.length = 0;
  vi.stubGlobal(
    'Audio',
    class {
      constructor(public src: string) {}
      play() {
        played.push(this.src);
        return Promise.resolve();
      }
    },
  );
  // Math.floor(0 * 3) = 0: the treasure is always in the first box.
  vi.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});

const summary = { games: 1, best: 100, recent: [{ score: 100, playedAt: '2026-10-11T01:00:00.000Z' }] };

// Returns the three chest images in box order.
const chests = () => screen.getAllByRole('img');

describe('App as a guest', () => {
  it('starts on the sign-in screen and plays a winning round after a skeleton', async () => {
    const user = userEvent.setup();
    const saveScore = vi.spyOn(api, 'saveScore');
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Play as guest' }));
    expect(screen.getByText('👤 Playing as guest — scores are not saved')).toBeInTheDocument();
    expect(screen.getAllByText('Click to open!')).toHaveLength(3);

    await user.click(chests()[1]);
    expect(screen.getByAltText('Skeleton!')).toBeInTheDocument();
    expect(screen.getByText('-$100')).toBeInTheDocument();
    expect(screen.getByText('$-100')).toHaveClass('text-red-600');
    expect(played).toEqual([expect.stringContaining('evil_laugh')]);

    // Clicking an open box again changes nothing.
    await user.click(chests()[1]);
    expect(screen.getByText('$-100')).toBeInTheDocument();
    expect(played).toHaveLength(1);

    await user.click(chests()[0]);
    expect(screen.getByAltText('Treasure!')).toBeInTheDocument();
    expect(played[1]).toMatch(/chest_open\b/);
    expect(screen.getByText('Win')).toBeInTheDocument();
    expect(screen.getByText('Game Over!')).toBeInTheDocument();
    expect(screen.getByText(/Treasure found!/)).toBeInTheDocument();

    // Boxes are locked once the game has ended.
    await user.click(chests()[2]);
    expect(screen.getAllByText('Click to open!')).toHaveLength(1);
    expect(saveScore).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Play Again' }));
    expect(screen.getAllByText('Click to open!')).toHaveLength(3);
    expect(screen.queryByText('Game Over!')).not.toBeInTheDocument();
  });

  it('shows a tie when the treasure is the last box opened', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Play as guest' }));
    await user.click(chests()[1]);
    await user.click(chests()[2]);
    await user.click(chests()[0]);
    // -100 - 100 + 200 = 0
    expect(screen.getByText('Tie')).toBeInTheDocument();
  });

  it('returns to the sign-in screen without calling the server', async () => {
    const user = userEvent.setup();
    const signOut = vi.spyOn(api, 'signOut');
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Play as guest' }));
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('button', { name: 'Play as guest' })).toBeInTheDocument();
    expect(signOut).not.toHaveBeenCalled();
  });
});

describe('App with an account', () => {
  it('restores a saved session, saves the final score and signs out', async () => {
    tokenStore.set('tok');
    vi.spyOn(api, 'me').mockResolvedValue({ username: 'alice' });
    vi.spyOn(api, 'getScores').mockResolvedValue({ games: 0, best: null, recent: [] });
    let finishSave!: (s: typeof summary) => void;
    const saveScore = vi.spyOn(api, 'saveScore').mockReturnValue(new Promise((resolve) => (finishSave = resolve)));
    const signOut = vi.spyOn(api, 'signOut').mockRejectedValue(new Error('offline'));
    const user = userEvent.setup();

    render(<App />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(await screen.findByText('👤 Signed in as alice')).toBeInTheDocument();
    expect(await screen.findByText(/No games yet/)).toBeInTheDocument();

    await user.click(chests()[0]);
    expect(saveScore).toHaveBeenCalledWith('tok', 200);
    expect(screen.getByText('Saving your score…')).toBeInTheDocument();
    finishSave(summary);
    expect(await screen.findByText('Score saved ✓')).toBeInTheDocument();
    expect(screen.getByText('Games played: 1 · Best score: $100')).toBeInTheDocument();
    expect(saveScore).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(signOut).toHaveBeenCalledWith('tok');
    expect(tokenStore.get()).toBeNull();
    expect(screen.getByRole('button', { name: 'Play as guest' })).toBeInTheDocument();
  });

  it('forgets an expired session', async () => {
    tokenStore.set('tok');
    vi.spyOn(api, 'me').mockRejectedValue(Object.assign(new Error('Please sign in again'), { status: 401 }));
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Play as guest' })).toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();
    expect(screen.queryByText('Please sign in again')).not.toBeInTheDocument();
  });

  it('keeps the session and shows a notice when the server is unreachable', async () => {
    tokenStore.set('tok');
    vi.spyOn(api, 'me').mockRejectedValue(new Error('Cannot reach the score server.'));
    render(<App />);
    expect(await screen.findByText('Cannot reach the score server.')).toBeInTheDocument();
    expect(tokenStore.get()).toBe('tok');
  });

  it('signs in from the form and reports score errors', async () => {
    vi.spyOn(api, 'signIn').mockResolvedValue({ token: 'new', username: 'bob' });
    vi.spyOn(api, 'getScores').mockRejectedValue(new Error('db down'));
    vi.spyOn(api, 'saveScore').mockRejectedValue(new Error('db still down'));
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('Username'), 'bob');
    await user.type(screen.getByLabelText('Password'), 'secret1');
    await user.click(screen.getByRole('button', { name: 'Sign in & play' }));
    expect(await screen.findByText('👤 Signed in as bob')).toBeInTheDocument();
    expect(tokenStore.get()).toBe('new');
    expect(await screen.findByText('Could not load your scores: db down')).toBeInTheDocument();

    await user.click(chests()[0]);
    await waitFor(() => expect(screen.getByText('Score not saved: db still down')).toHaveClass('text-red-600'));
  });
});
