import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { api, type Session } from '../api';

type Mode = 'signin' | 'signup';

interface AuthScreenProps {
  onSignedIn: (session: Session) => void;
  onPlayAsGuest: () => void;
  notice?: string | null;
}

// Sign-in / sign-up form with a guest option. Input: callbacks for a new session or guest play, optional notice text. Output: the auth card.
export function AuthScreen({ onSignedIn, onPlayAsGuest, notice }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(notice ?? null);
  const [submitting, setSubmitting] = useState(false);

  // Submits the form to sign in or sign up. Input: form submit event. Output: none (calls onSignedIn on success).
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const session = mode === 'signin'
        ? await api.signIn(username, password)
        : await api.signUp(username, password);
      onSignedIn(session);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  // Switches between the sign-in and sign-up tabs. Input: target mode. Output: none.
  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ maxWidth: '24rem' }}
      className="w-full p-6 bg-amber-200/80 backdrop-blur-sm rounded-xl shadow-lg border-2 border-amber-400"
    >
      <div className="flex gap-2 mb-4">
        {(['signin', 'signup'] as const).map((tab) => (
          <Button
            key={tab}
            type="button"
            variant={mode === tab ? 'default' : 'outline'}
            onClick={() => switchMode(tab)}
            className={`flex-1 ${mode === tab ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'text-amber-900'}`}
          >
            {tab === 'signin' ? 'Sign in' : 'Sign up'}
          </Button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="username" className="text-amber-900">Username</Label>
          <Input
            id="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={mode === 'signup' ? '3-20 letters, numbers or _' : ''}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="text-amber-900">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? 'At least 6 characters' : ''}
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={submitting} className="bg-amber-600 hover:bg-amber-700 text-white">
          {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign in & play' : 'Create account & play'}
        </Button>
      </form>

      <div className="mt-4 pt-4 border-t border-amber-400 text-center">
        <Button
          type="button"
          variant="ghost"
          onClick={onPlayAsGuest}
          className="text-amber-800"
        >
          Play as guest
        </Button>
        <p className="text-sm text-amber-700 mt-2">Guest scores are not saved.</p>
      </div>
    </motion.div>
  );
}
