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

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [player, setPlayer] = useState<Player | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [gameScale, setGameScale] = useState(1.0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Initialize the engine once on mount — the canvas is always in the DOM
  // so we can start the loop immediately rather than waiting for PLAYING state.
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
    engineRef.current?.setState('MENU');
  };

  const toggleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen);
  };

  return (
    <Layout 
      title={gameState === 'PLAYING' ? 'ARCHITECT_OS // ACTIVE' : 'ARCHITECT_OS'}
      onSettingsClick={toggleSettings}
    >
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-surface">
        {/* Game Container with Scaling */}
        <div
          className={`relative w-full h-full flex items-center justify-center transition-transform duration-300 ease-out ${
            gameState !== 'PLAYING' ? 'hidden' : ''
          }`}
          style={{ transform: `scale(${gameScale})` }}
        >
          {/* Canvas always stays display:block to prevent context loss on show/hide */}
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="block max-w-full max-h-full bg-surface-container-lowest border-[0.5px] border-outline-variant/10"
          />
        </div>

        {/* UI Overlays */}
        {gameState === 'MENU' && <MainMenu onStart={handleStart} />}
        
        {gameState === 'PLAYING' && player && (
          <BattleHUD player={player} />
        )}

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

        {gameState === 'GAME_OVER' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-surface/95 backdrop-blur-xl">
            <div className="text-center p-12 border border-red-500/30 bg-surface-container-lowest">
              <h1 className="text-6xl font-headline font-bold tracking-tighter mb-4 text-red-500">SYSTEM_FAILURE</h1>
              <p className="text-outline mb-8 tracking-widest">INTEGRITY_LOST // ARCHITECTURE_COLLAPSED</p>
              <button
                onClick={handleAbort}
                className="px-8 py-3 bg-red-500 text-surface font-label text-xs tracking-widest uppercase hover:bg-red-400 transition-colors"
              >
                REBOOT_SYSTEM
              </button>
            </div>
          </div>
        )}

        {gameState === 'VICTORY' && player && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-surface/90 backdrop-blur-xl">
            <div className="text-center p-12 border border-primary/20 bg-surface-container-lowest">
              <h1 className="text-6xl font-headline font-bold tracking-tighter mb-4">MISSION_COMPLETE</h1>
              <p className="text-outline mb-8 tracking-widest">SYSTEM_STABILIZED // ARCHITECT_OS_SECURED</p>
              <button
                onClick={handleAbort}
                className="px-8 py-3 bg-primary text-surface font-label text-xs tracking-widest uppercase hover:bg-primary/80 transition-colors"
              >
                RETURN_TO_TERMINAL
              </button>
            </div>
          </div>
        )}

        {/* Global Settings Modal */}
        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
          scale={gameScale}
          onScaleChange={setGameScale}
        />

        {/* Global Grid Overlay (Subtle) */}
        <div className="absolute inset-0 pointer-events-none grid-bg opacity-10 z-0"></div>
      </div>
    </Layout>
  );
};

export default App;
