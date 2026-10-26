import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoreHistory } from '../../src/components/ScoreHistory';

describe('ScoreHistory', () => {
  it('shows a loading message without a summary', () => {
    render(<ScoreHistory summary={null} />);
    expect(screen.getByText('Loading your scores…')).toBeInTheDocument();
  });

  it('shows an empty state when no games are saved', () => {
    render(<ScoreHistory summary={{ games: 0, best: null, recent: [] }} />);
    expect(screen.getByText(/No games yet/)).toBeInTheDocument();
  });

  it('lists recent games with win and loss colors', () => {
    render(
      <ScoreHistory
        summary={{
          games: 2,
          best: 100,
          recent: [
            { score: 100, playedAt: '2026-10-11T01:00:00.000Z' },
            { score: -50, playedAt: '2026-10-10T01:00:00.000Z' },
          ],
        }}
      />,
    );
    expect(screen.getByText('Games played: 2 · Best score: $100')).toBeInTheDocument();
    expect(screen.getByText('$100')).toHaveClass('text-green-600');
    expect(screen.getByText('$-50')).toHaveClass('text-red-600');
  });
});
