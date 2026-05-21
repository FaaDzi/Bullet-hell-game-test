import React from 'react';
import { motion } from 'motion/react';
import { DIFFICULTY_SETTINGS } from '../constants';
import { Difficulty } from '../types';

interface DifficultySelectProps {
  onSelect: (diff: Difficulty) => void;
  onBack?: () => void;
}

export const DifficultySelect: React.FC<DifficultySelectProps> = ({ onSelect, onBack }) => {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const difficulties = Object.keys(DIFFICULTY_SETTINGS) as Difficulty[];

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        setSelectedIndex((prev) => (prev + 1) % difficulties.length);
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        setSelectedIndex((prev) => (prev - 1 + difficulties.length) % difficulties.length);
      } else if (e.code === 'Space' || e.code === 'Enter') {
        onSelect(difficulties[selectedIndex]);
      } else if (e.code === 'Escape' && onBack) {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, difficulties, onSelect, onBack]);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-8 bg-surface/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl bg-surface-container-lowest border-[0.5px] border-primary/20 p-12 relative overflow-hidden"
      >
        {/* Decorative Grid */}
        <div className="absolute inset-0 pointer-events-none grid-bg opacity-5"></div>

        <div className="relative z-10">
          <div className="mb-12 border-b-[0.5px] border-outline-variant pb-4 flex justify-between items-end">
            <div>
              <h1 className="font-headline text-3xl font-bold tracking-tight uppercase">SELECT_DIFFICULTY_PROTOCOL</h1>
              <p className="font-label text-[10px] tracking-widest text-outline mt-2">CALIBRATING_EUCLIDEAN_PARAMETERS...</p>
            </div>
            {onBack && (
              <button 
                onClick={onBack}
                className="font-label text-[10px] tracking-widest uppercase text-primary/60 hover:text-primary transition-colors border border-primary/20 hover:border-primary/50 px-4 py-2"
              >
                BACK_TO_SHIP_SELECT [ESC]
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {difficulties.map((diff, index) => (
              <button
                key={diff}
                onClick={() => onSelect(diff)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`group flex flex-col p-8 border-[0.5px] transition-all duration-300 focus:outline-none relative ${
                  selectedIndex === index 
                    ? 'bg-primary text-surface border-primary' 
                    : 'border-outline-variant/30 text-left hover:bg-primary/20'
                }`}
              >
                <div className="mb-8">
                  <div className={`font-label text-[10px] mb-2 uppercase tracking-widest ${selectedIndex === index ? 'text-surface/60' : 'text-outline group-hover:text-primary/60'}`}>
                    LVL_{diff === 'STABLE' ? '01' : diff === 'FLUX' ? '02' : '03'}
                  </div>
                  <h2 className="font-headline text-2xl font-bold tracking-tighter uppercase mb-4">{diff}</h2>
                  <p className={`font-body text-xs leading-relaxed mb-6 ${selectedIndex === index ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
                    {DIFFICULTY_SETTINGS[diff].description}
                  </p>
                  
                  <div className={`space-y-2 pt-4 border-t-[0.5px] ${selectedIndex === index ? 'border-surface/20' : 'border-outline-variant/20 group-hover:border-primary/20'}`}>
                    <div className="flex justify-between font-label text-[8px] tracking-widest uppercase">
                      <span>Initial_Bombs</span>
                      <span className="text-primary group-hover:text-surface">{DIFFICULTY_SETTINGS[diff].initialBombs}</span>
                    </div>
                    <div className="flex justify-between font-label text-[8px] tracking-widest uppercase">
                      <span>Enemy_Density</span>
                      <span className="text-primary group-hover:text-surface">x{DIFFICULTY_SETTINGS[diff].enemyCountMultiplier.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between font-label text-[8px] tracking-widest uppercase">
                      <span>Boss_Integrity</span>
                      <span className="text-primary group-hover:text-surface">x{DIFFICULTY_SETTINGS[diff].bossHealthMultiplier.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex items-center gap-3">
                  <div className="h-[1px] w-8 bg-primary group-hover:bg-surface transition-colors"></div>
                  <span className="font-label text-[9px] tracking-widest uppercase">INITIATE</span>
                </div>

                {/* Multiplier Badge */}
                <div className="absolute top-4 right-4 font-mono text-[10px] opacity-30 group-hover:opacity-100">
                  x{DIFFICULTY_SETTINGS[diff].multiplier.toFixed(1)}
                </div>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
