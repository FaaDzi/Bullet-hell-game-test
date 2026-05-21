/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Layout } from './components/Layout';
import { MainMenu } from './components/MainMenu';
import { PilotSelection } from './components/PilotSelection';
import { ShipSelection } from './components/ShipSelection';
import { BattleHUD } from './components/BattleHUD';
import { WaveComplete } from './components/WaveComplete';
import { SettingsModal } from './components/SettingsModal';
import { DifficultySelect } from './components/DifficultySelect';
import { GameEngine } from './engine/GameEngine';
import { GameState, Player, Module, Difficulty } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';
import { scoreService, ScoreEntry } from './services/scoreService';

const SHIP_LABELS: Record<string, string> = {
  VOTIVE_ORB: 'VOTIVE_ORB',
  PULSE_NODE: 'PULSE_NODE',
  VOID_SPIRE: 'VOID_SPIRE',
};

const LeaderboardTable: React.FC<{ entries: ScoreEntry[]; highlightName?: string }> = ({ entries, highlightName }) => (
  <div className="w-full mt-4">
    <div className="flex justify-between font-label text-[9px] tracking-widest text-outline uppercase mb-2 px-2">
      <span className="w-6">#</span>
      <span className="flex-1">Designation</span>
      <span className="w-20 text-right">Score</span>
      <span className="w-16 text-right">Kills</span>
      <span className="w-16 text-right">Stage</span>
    </div>
    <div className="w-full h-[0.5px] bg-outline-variant/30 mb-2" />
    {entries.length === 0 && (
      <p className="text-outline text-[10px] tracking-widest text-center py-4">NO_ENTRIES_FOUND</p>
    )}
    {entries.map((e, i) => (
      <div
        key={i}
        className={`flex justify-between font-label text-[10px] tracking-wider px-2 py-1 ${
          e.name === highlightName ? 'text-primary bg-primary/10' : 'text-on-surface'
        }`}
      >
        <span className="w-6 text-outline">{i + 1}</span>
        <span className="flex-1">{e.name}</span>
        <span className="w-20 text-right">{e.score.toLocaleString()}</span>
        <span className="w-16 text-right text-outline">{e.kills}</span>
        <span className="w-16 text-right text-outline">{e.stage}</span>
      </div>
    ))}
  </div>
);

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [player, setPlayer] = useState<Player | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [gameScale, setGameScale] = useState(1.0);
  const [playerName, setPlayerName] = useState('');
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new GameEngine(
        (state) => setGameState(state),
        (p) => setPlayer(p)
      );
    }
    if (canvasRef.current) {
      engineRef.current.init(canvasRef.current);
    }
  }, []);

  const handleStart = () => {
    setGameState('SHIP_SELECT');
  };

  const handleShipSelect = (shipType: 'VOTIVE_ORB' | 'PULSE_NODE' | 'VOID_SPIRE') => {
    engineRef.current?.setShipType(shipType);
    setGameState('DIFFICULTY_SELECT');
  };

  const handleDifficultySelect = (diff: Difficulty) => {
    engineRef.current?.setDifficulty(diff);
  };

  const handleModuleSelect = (module: Module) => {
    engineRef.current?.applyModule(module);
    engineRef.current?.nextStage();
  };

  const handleContinue = () => {
    engineRef.current?.setState('PLAYING');
  };

  const handleAbort = () => {
    setPlayerName('');
    setNameSubmitted(false);
    setShowLeaderboard(false);
    engineRef.current?.setState('MENU');
  };

  const handleScoreSubmit = (isVictory: boolean) => {
    if (!playerName.trim() || !player) return;
    scoreService.save({
      name: playerName.trim(),
      score: scoreService.calculate(player.kills, player.level, player.experience),
      kills: player.kills,
      stage: player.level,
      shipType: SHIP_LABELS[player.shipType] ?? player.shipType,
      date: new Date().toLocaleDateString(),
    });
    setNameSubmitted(true);
  };

  const toggleSettings = () => setIsSettingsOpen(!isSettingsOpen);

  const scores = scoreService.list();
  const submittedName = nameSubmitted ? playerName.trim() : undefined;

  return (
    <Layout
      title={gameState === 'PLAYING' ? 'ARCHITECT_OS // ACTIVE' : 'ARCHITECT_OS'}
      onSettingsClick={toggleSettings}
    >
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-surface">
        {/* Game Container */}
        <div
          className={`relative w-full h-full flex items-center justify-center transition-transform duration-300 ease-out ${
            gameState !== 'PLAYING' ? 'hidden' : ''
          }`}
          style={{ transform: `scale(${gameScale})` }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="block max-w-full max-h-full bg-surface-container-lowest border-[0.5px] border-outline-variant/10"
          />
        </div>

        {/* UI Overlays */}
        {gameState === 'MENU' && (
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            <MainMenu onStart={handleStart} />
            <button
              onClick={() => setShowLeaderboard(v => !v)}
              className="absolute bottom-12 right-12 font-label text-[9px] tracking-widest text-outline uppercase hover:text-primary transition-colors"
            >
              {showLeaderboard ? 'HIDE_LEADERBOARD' : 'VIEW_LEADERBOARD'}
            </button>
            {showLeaderboard && (
              <div className="absolute bottom-24 right-12 w-[480px] bg-surface-container-lowest border border-outline-variant/20 p-6">
                <h2 className="font-headline text-sm tracking-widest uppercase text-primary mb-2">Global_Leaderboard</h2>
                <LeaderboardTable entries={scores} />
              </div>
            )}
          </div>
        )}

        {gameState === 'PLAYING' && player && <BattleHUD player={player} />}

        {gameState === 'DIFFICULTY_SELECT' && (
          <DifficultySelect
            onSelect={handleDifficultySelect}
            onBack={() => setGameState('SHIP_SELECT')}
          />
        )}

        {gameState === 'SHIP_SELECT' && (
          <ShipSelection onSelect={handleShipSelect} />
        )}

        {gameState === 'LEVELING' && (
          <PilotSelection
            options={engineRef.current?.getCardOptions() || []}
            onSelect={handleModuleSelect}
          />
        )}

        {(gameState === 'WAVE_COMPLETE' || gameState === 'STAGE_COMPLETE') && player && (
          <WaveComplete
            player={player}
            onContinue={handleContinue}
            onAbort={handleAbort}
          />
        )}

        {gameState === 'GAME_OVER' && player && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-surface/95 backdrop-blur-xl">
            <div className="w-[520px] p-10 border border-red-500/30 bg-surface-container-lowest">
              <h1 className="text-5xl font-headline font-bold tracking-tighter mb-1 text-red-500">SYSTEM_FAILURE</h1>
              <p className="text-outline mb-6 tracking-widest text-xs">INTEGRITY_LOST // ARCHITECTURE_COLLAPSED</p>

              <div className="flex gap-8 mb-6 font-label text-[10px] tracking-widest text-outline uppercase">
                <span>SCORE: <span className="text-primary font-bold">{scoreService.calculate(player.kills, player.level, player.experience).toLocaleString()}</span></span>
                <span>KILLS: <span className="text-on-surface">{player.kills}</span></span>
                <span>STAGE: <span className="text-on-surface">{player.level}</span></span>
              </div>

              {!nameSubmitted ? (
                <div className="flex flex-col gap-3 mb-6">
                  <label className="font-label text-[9px] tracking-widest text-outline uppercase">Enter_Designation</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={16}
                      value={playerName}
                      onChange={e => setPlayerName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleScoreSubmit(false)}
                      placeholder="ANONYMOUS"
                      className="flex-1 bg-surface border border-outline-variant/40 text-on-surface font-label text-xs tracking-widest px-3 py-2 outline-none focus:border-primary/60"
                    />
                    <button
                      onClick={() => handleScoreSubmit(false)}
                      disabled={!playerName.trim()}
                      className="px-4 py-2 bg-red-500 text-surface font-label text-[9px] tracking-widest uppercase hover:bg-red-400 transition-colors disabled:opacity-40"
                    >
                      SUBMIT
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <h3 className="font-label text-[9px] tracking-widest text-outline uppercase mb-2">Leaderboard</h3>
                  <LeaderboardTable entries={scores} highlightName={submittedName} />
                </div>
              )}

              <button
                onClick={handleAbort}
                className="w-full px-8 py-3 bg-red-500 text-surface font-label text-xs tracking-widest uppercase hover:bg-red-400 transition-colors"
              >
                REBOOT_SYSTEM
              </button>
            </div>
          </div>
        )}

        {gameState === 'VICTORY' && player && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-surface/90 backdrop-blur-xl">
            <div className="w-[520px] p-10 border border-primary/20 bg-surface-container-lowest">
              <h1 className="text-5xl font-headline font-bold tracking-tighter mb-1">MISSION_COMPLETE</h1>
              <p className="text-outline mb-6 tracking-widest text-xs">SYSTEM_STABILIZED // ARCHITECT_OS_SECURED</p>

              <div className="flex gap-8 mb-6 font-label text-[10px] tracking-widest text-outline uppercase">
                <span>SCORE: <span className="text-primary font-bold">{scoreService.calculate(player.kills, player.level, player.experience).toLocaleString()}</span></span>
                <span>KILLS: <span className="text-on-surface">{player.kills}</span></span>
                <span>STAGE: <span className="text-on-surface">{player.level}</span></span>
              </div>

              {!nameSubmitted ? (
                <div className="flex flex-col gap-3 mb-6">
                  <label className="font-label text-[9px] tracking-widest text-outline uppercase">Enter_Designation</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={16}
                      value={playerName}
                      onChange={e => setPlayerName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleScoreSubmit(true)}
                      placeholder="ANONYMOUS"
                      className="flex-1 bg-surface border border-outline-variant/40 text-on-surface font-label text-xs tracking-widest px-3 py-2 outline-none focus:border-primary/60"
                    />
                    <button
                      onClick={() => handleScoreSubmit(true)}
                      disabled={!playerName.trim()}
                      className="px-4 py-2 bg-primary text-surface font-label text-[9px] tracking-widest uppercase hover:bg-primary/80 transition-colors disabled:opacity-40"
                    >
                      SUBMIT
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <h3 className="font-label text-[9px] tracking-widest text-outline uppercase mb-2">Leaderboard</h3>
                  <LeaderboardTable entries={scores} highlightName={submittedName} />
                </div>
              )}

              <button
                onClick={handleAbort}
                className="w-full px-8 py-3 bg-primary text-surface font-label text-xs tracking-widest uppercase hover:bg-primary/80 transition-colors"
              >
                RETURN_TO_TERMINAL
              </button>
            </div>
          </div>
        )}

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          scale={gameScale}
          onScaleChange={setGameScale}
        />

        <div className="absolute inset-0 pointer-events-none grid-bg opacity-10 z-0"></div>
      </div>
    </Layout>
  );
};

export default App;
