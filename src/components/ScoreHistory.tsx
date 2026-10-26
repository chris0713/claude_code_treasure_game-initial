import type { ScoreSummary } from '../api';

// Shows a signed-in player's saved games. Input: score summary from the API (null while loading). Output: the history panel.
export function ScoreHistory({ summary }: { summary: ScoreSummary | null }) {
  if (!summary) {
    return <p className="text-sm text-amber-700">Loading your scores…</p>;
  }

  return (
    <div style={{ maxWidth: '24rem' }} className="w-full p-4 bg-amber-200/80 backdrop-blur-sm rounded-xl shadow-lg border-2 border-amber-400 text-amber-900">
      <h2 className="text-lg mb-2">Your saved games</h2>
      {summary.games === 0 ? (
        <p className="text-sm text-amber-700">No games yet — finish a round to save your first score.</p>
      ) : (
        <>
          <p className="text-sm mb-2">
            Games played: {summary.games} · Best score: ${summary.best}
          </p>
          <ul className="text-sm">
            {summary.recent.map((game, index) => (
              <li key={index} className="flex justify-between">
                <span className="text-amber-700">{new Date(game.playedAt).toLocaleString()}</span>
                <span className={game.score >= 0 ? 'text-green-600' : 'text-red-600'}>${game.score}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
