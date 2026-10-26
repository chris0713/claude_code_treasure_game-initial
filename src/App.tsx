import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Button } from './components/ui/button';
import { AuthScreen } from './components/AuthScreen';
import { ScoreHistory } from './components/ScoreHistory';
import { api, tokenStore, type Session, type ScoreSummary } from './api';
import closedChest from './assets/treasure_closed.png';
import treasureChest from './assets/treasure_opened.png';
import skeletonChest from './assets/treasure_opened_skeleton.png';
import keyIcon from './assets/key.png';
import chestOpenSound from './audios/chest_open.mp3';
import evilLaughSound from './audios/chest_open_with_evil_laugh.mp3';

interface Box {
  id: number;
  isOpen: boolean;
  hasTreasure: boolean;
}

// Guests play without an account and nothing is sent to the server.
type Player = { kind: 'guest' } | { kind: 'user'; session: Session };

type SaveStatus = { state: 'saving' | 'saved' } | { state: 'error'; message: string } | null;

export default function App() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [score, setScore] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);
  const [round, setRound] = useState(0);

  const [player, setPlayer] = useState<Player | null>(null);
  const [restoringSession, setRestoringSession] = useState(() => tokenStore.get() !== null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [scoreSummary, setScoreSummary] = useState<ScoreSummary | null>(null);
  const [scoresError, setScoresError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(null);
  const savedRoundRef = useRef(-1);

  const initializeGame = () => {
    // Randomly assign treasure to one box
    const treasureBoxIndex = Math.floor(Math.random() * 3);
    const newBoxes: Box[] = Array.from({ length: 3 }, (_, index) => ({
      id: index,
      isOpen: false,
      hasTreasure: index === treasureBoxIndex,
    }));
    
    setBoxes(newBoxes);
    setScore(0);
    setGameEnded(false);
    setRound(r => r + 1);
    setSaveStatus(null);
  };

  // Initialize game automatically when component mounts
  useEffect(() => {
    initializeGame();
  }, []);

  // Starts a fresh game for a guest or signed-in player and loads the player's saved scores. Input: player. Output: none.
  const startPlaying = (next: Player) => {
    setPlayer(next);
    setAuthNotice(null);
    setScoreSummary(null);
    setScoresError(null);
    initializeGame();
    if (next.kind === 'user') {
      api.getScores(next.session.token)
        .then(setScoreSummary)
        .catch((err: Error) => setScoresError(err.message));
    }
  };

  // Restore a saved sign-in after a page reload
  useEffect(() => {
    const token = tokenStore.get();
    if (!token) return;
    api.me(token)
      .then(({ username }) => startPlaying({ kind: 'user', session: { token, username } }))
      .catch((err: Error & { status?: number }) => {
        if (err.status === 401) tokenStore.clear();
        else setAuthNotice(err.message);
      })
      .finally(() => setRestoringSession(false));
  }, []);

  // Save the final score once per round for signed-in players (guests are never saved)
  useEffect(() => {
    if (!gameEnded || player?.kind !== 'user' || savedRoundRef.current === round) return;
    savedRoundRef.current = round;
    setSaveStatus({ state: 'saving' });
    api.saveScore(player.session.token, score)
      .then((summary) => {
        setScoreSummary(summary);
        setScoresError(null);
        setSaveStatus({ state: 'saved' });
      })
      .catch((err: Error) => setSaveStatus({ state: 'error', message: err.message }));
  }, [gameEnded, player, round, score]);

  // Stores the new session and starts playing. Input: session returned by sign in / sign up. Output: none.
  const handleSignedIn = (session: Session) => {
    tokenStore.set(session.token);
    startPlaying({ kind: 'user', session });
  };

  // Signs out (or leaves guest mode) and returns to the sign-in screen. Input: none. Output: none.
  const leaveGame = () => {
    if (player?.kind === 'user') {
      api.signOut(player.session.token).catch(() => {});
      tokenStore.clear();
    }
    setPlayer(null);
  };

  const openBox = (boxId: number) => {
    if (gameEnded) return;

    const targetBox = boxes.find(box => box.id === boxId);
    if (targetBox && !targetBox.isOpen) {
      new Audio(targetBox.hasTreasure ? chestOpenSound : evilLaughSound).play();
    }

    setBoxes(prevBoxes => {
      const updatedBoxes = prevBoxes.map(box => {
        if (box.id === boxId && !box.isOpen) {
          const newScore = box.hasTreasure ? score + 200 : score - 100;
          setScore(newScore);
          return { ...box, isOpen: true };
        }
        return box;
      });
      
      // Check if treasure is found or all boxes are opened
      const treasureFound = updatedBoxes.some(box => box.isOpen && box.hasTreasure);
      const allOpened = updatedBoxes.every(box => box.isOpen);
      if (treasureFound || allOpened) {
        setGameEnded(true);
      }
      
      return updatedBoxes;
    });
  };

  const resetGame = () => {
    initializeGame();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 flex flex-col items-center justify-center p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl mb-4 text-amber-900">🏴‍☠️ Treasure Hunt Game 🏴‍☠️</h1>
        <p className="text-amber-800 mb-4">
          Click on the treasure chests to discover what's inside!
        </p>
        <p className="text-amber-700 text-sm">
          💰 Treasure: +$200 | 💀 Skeleton: -$100
        </p>
      </div>

      {restoringSession ? (
        <p className="text-amber-800">Loading…</p>
      ) : !player ? (
        <AuthScreen
          onSignedIn={handleSignedIn}
          onPlayAsGuest={() => startPlaying({ kind: 'guest' })}
          notice={authNotice}
        />
      ) : (
      <>
      <div className="mb-4 flex items-center gap-4 text-amber-800">
        <span>
          {player.kind === 'user'
            ? `👤 Signed in as ${player.session.username}`
            : '👤 Playing as guest — scores are not saved'}
        </span>
        <Button variant="outline" size="sm" onClick={leaveGame}>
          {player.kind === 'user' ? 'Sign out' : 'Sign in'}
        </Button>
      </div>

      <div className="mb-8 flex items-center gap-4">
        <div className="text-2xl text-center p-4 bg-amber-200/80 backdrop-blur-sm rounded-lg shadow-lg border-2 border-amber-400">
          <span className="text-amber-900">Current Score: </span>
          <span className={`${score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${score}
          </span>
        </div>

        {gameEnded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={`text-2xl p-4 rounded-lg shadow-lg border-2 ${
              score > 0
                ? 'bg-green-100 text-green-800 border-green-300'
                : score < 0
                  ? 'bg-red-100 text-red-800 border-red-300'
                  : 'bg-amber-200/80 text-amber-900 border-amber-400'
            }`}
          >
            {score > 0 ? 'Win' : score < 0 ? 'Loss' : 'Tie'}
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {boxes.map((box) => (
              <motion.div
                key={box.id}
                className="flex flex-col items-center"
                style={{ cursor: box.isOpen ? 'pointer' : `url("${keyIcon}"), pointer` }}
                whileHover={{ scale: box.isOpen ? 1 : 1.05 }}
                whileTap={{ scale: box.isOpen ? 1 : 0.95 }}
                onClick={() => openBox(box.id)}
              >
                <motion.div
                  initial={{ rotateY: 0 }}
                  animate={{ 
                    rotateY: box.isOpen ? 180 : 0,
                    scale: box.isOpen ? 1.1 : 1
                  }}
                  transition={{ 
                    duration: 0.6,
                    ease: "easeInOut"
                  }}
                  className="relative"
                >
                  <img
                    src={box.isOpen 
                      ? (box.hasTreasure ? treasureChest : skeletonChest)
                      : closedChest
                    }
                    alt={box.isOpen 
                      ? (box.hasTreasure ? "Treasure!" : "Skeleton!")
                      : "Treasure Chest"
                    }
                    className="w-48 h-48 object-contain drop-shadow-lg"
                  />
                  
                  {box.isOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                      className="absolute -top-8 left-1/2 transform -translate-x-1/2"
                    >
                      {box.hasTreasure ? (
                        <div className="text-2xl animate-bounce">✨💰✨</div>
                      ) : (
                        <div className="text-2xl animate-pulse">💀👻💀</div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
                
                <div className="mt-4 text-center">
                  {box.isOpen ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4, duration: 0.3 }}
                      className={`text-lg p-2 rounded-lg ${
                        box.hasTreasure 
                          ? 'bg-green-100 text-green-800 border border-green-300' 
                          : 'bg-red-100 text-red-800 border border-red-300'
                      }`}
                    >
                      {box.hasTreasure ? '+$200' : '-$100'}
                    </motion.div>
                  ) : (
                    <div className="text-amber-700 p-2">
                      Click to open!
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
      </div>

      {gameEnded && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="mb-4 p-6 bg-amber-200/80 backdrop-blur-sm rounded-xl shadow-lg border-2 border-amber-400">
                <h2 className="text-2xl mb-2 text-amber-900">Game Over!</h2>
                <p className="text-lg text-amber-800">
                  Final Score: <span className={`${score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${score}
                  </span>
                </p>
                <p className="text-sm text-amber-600 mt-2">
                  {boxes.some(box => box.isOpen && box.hasTreasure) 
                    ? 'Treasure found! Well done, treasure hunter! 🎉' 
                    : 'No treasure found this time! Better luck next time! 💀'}
                </p>
                {player.kind === 'user' && saveStatus && (
                  <p className={`text-sm mt-2 ${saveStatus.state === 'error' ? 'text-red-600' : 'text-amber-700'}`}>
                    {saveStatus.state === 'saving' && 'Saving your score…'}
                    {saveStatus.state === 'saved' && 'Score saved ✓'}
                    {saveStatus.state === 'error' && `Score not saved: ${saveStatus.message}`}
                  </p>
                )}
              </div>
              
              <Button 
                onClick={resetGame}
                className="text-lg px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white"
              >
                Play Again
              </Button>
            </motion.div>
          )}

      {player.kind === 'user' && (
        <div className="mt-4 w-full flex justify-center">
          {scoresError && !scoreSummary
            ? <p className="text-sm text-red-600">Could not load your scores: {scoresError}</p>
            : <ScoreHistory summary={scoreSummary} />}
        </div>
      )}
      </>
      )}
    </div>
  );
}
