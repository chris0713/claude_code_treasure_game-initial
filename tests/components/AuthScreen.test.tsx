import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthScreen } from '../../src/components/AuthScreen';
import { api } from '../../src/api';

afterEach(() => vi.restoreAllMocks());

// Renders the auth screen with mock callbacks. Input: optional notice. Output: callbacks and a user-event instance.
function setup(notice?: string | null) {
  const onSignedIn = vi.fn();
  const onPlayAsGuest = vi.fn();
  render(<AuthScreen onSignedIn={onSignedIn} onPlayAsGuest={onPlayAsGuest} notice={notice} />);
  return { onSignedIn, onPlayAsGuest, user: userEvent.setup() };
}

describe('AuthScreen', () => {
  it('signs in with the entered credentials', async () => {
    const session = { token: 't', username: 'alice' };
    const signIn = vi.spyOn(api, 'signIn').mockResolvedValue(session);
    const { onSignedIn, user } = setup();
    await user.type(screen.getByLabelText('Username'), 'alice');
    await user.type(screen.getByLabelText('Password'), 'secret1');
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password');
    await user.click(screen.getByRole('button', { name: 'Sign in & play' }));
    expect(signIn).toHaveBeenCalledWith('alice', 'secret1');
    expect(onSignedIn).toHaveBeenCalledWith(session);
  });

  it('signs up in sign-up mode and shows server errors', async () => {
    const signUp = vi.spyOn(api, 'signUp').mockRejectedValue(new Error('That username is already taken'));
    const { onSignedIn, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(screen.getByLabelText('Username')).toHaveAttribute('placeholder', '3-20 letters, numbers or _');
    expect(screen.getByLabelText('Password')).toHaveAttribute('placeholder', 'At least 6 characters');
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password');
    await user.type(screen.getByLabelText('Username'), 'alice');
    await user.type(screen.getByLabelText('Password'), 'secret1');
    await user.click(screen.getByRole('button', { name: 'Create account & play' }));
    expect(signUp).toHaveBeenCalledWith('alice', 'secret1');
    expect(await screen.findByText('That username is already taken')).toBeInTheDocument();
    expect(onSignedIn).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Create account & play' })).toBeEnabled();
  });

  it('disables the submit button while waiting', async () => {
    vi.spyOn(api, 'signIn').mockReturnValue(new Promise(() => {}));
    const { user } = setup();
    await user.type(screen.getByLabelText('Username'), 'alice');
    await user.type(screen.getByLabelText('Password'), 'secret1');
    await user.click(screen.getByRole('button', { name: 'Sign in & play' }));
    expect(screen.getByRole('button', { name: 'Please wait…' })).toBeDisabled();
  });

  it('shows the notice until the mode changes', async () => {
    const { user } = setup('Cannot reach the score server.');
    expect(screen.getByText('Cannot reach the score server.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(screen.queryByText('Cannot reach the score server.')).not.toBeInTheDocument();
  });

  it('lets the player continue as a guest', async () => {
    const { onPlayAsGuest, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Play as guest' }));
    expect(onPlayAsGuest).toHaveBeenCalled();
  });
});
