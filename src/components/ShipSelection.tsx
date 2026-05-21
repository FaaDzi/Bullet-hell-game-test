import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Zap, Target, Shield } from 'lucide-react';

interface ShipSelectionProps {
  onSelect: (shipType: 'VOTIVE_ORB' | 'PULSE_NODE' | 'VOID_SPIRE') => void;
}

const SHIPS = [
  {
    id: 'VOTIVE_ORB',
    name: 'VOTIVE ORB',
    description: 'High-frequency energy core designed for relentless suppression.',
    abilities: {
      primary: 'Rapid Fire: High fire rate kinetic pulses.',
      alternate: 'Focused Stream: Narrow, high-velocity barrage.',
      special: 'Energy Burst: 360-degree radial blast.'
    },
    position: '0% 50%',
    icon: <Zap className="w-3 h-3" />,
  },
  {
    id: 'PULSE_NODE',
    name: 'PULSE NODE',
    description: 'Kinetic geometry unit. Spins through enemy fire — momentum is survival.',
    abilities: {
      primary: 'Auto Pulse: Steady kinetic output while rotating.',
      alternate: 'Narrow Beam: High-velocity concentrated pulse.',
      special: 'Dash [SPACE]: Invincible burst forward. Charge meter for a shockwave burst on departure.'
    },
    position: '50% 50%',
    icon: <Shield className="w-3 h-3" />,
  },
  {
    id: 'VOID_SPIRE',
    name: 'VOID SPIRE',
    description: 'Experimental non-Euclidean spire that pierces reality.',
    abilities: {
      primary: 'Heavy Piercing: High damage, low fire rate.',
      alternate: 'Void Shards: Homing energy fragments.',
      special: 'Void Rift: Massive damage to all detected threats.'
    },
    position: '100% 50%',
    icon: <Target className="w-3 h-3" />,
  },
] as const;

export const ShipSelection: React.FC<ShipSelectionProps> = ({ onSelect }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const nextShip = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % SHIPS.length);
  };
  const prevShip = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + SHIPS.length) % SHIPS.length);
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        nextShip();
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        prevShip();
      } else if (e.code === 'Space' || e.code === 'Enter') {
        onSelect(SHIPS[currentIndex].id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, onSelect]);

  const handleDragEnd = (event: any, info: any) => {
    if (info.offset.x < -50) {
      nextShip();
    } else if (info.offset.x > 50) {
      prevShip();
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 200 : -200,
      opacity: 0,
      scale: 0.9,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 200 : -200,
      opacity: 0,
      scale: 0.9,
    }),
  };

  const currentShip = SHIPS[currentIndex];

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-surface/95 backdrop-blur-2xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl bg-surface-container-lowest border border-primary/20 shadow-2xl relative flex flex-col overflow-hidden rounded-lg"
      >
        {/* Header */}
        <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-low">
          <div>
            <h1 className="font-headline text-xl font-bold tracking-tighter uppercase text-primary">Architecture_Selection</h1>
            <p className="font-label text-[10px] tracking-[0.3em] text-outline uppercase">Select vessel for link initiation</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex gap-2">
              {SHIPS.map((_, i) => (
                <div 
                  key={i} 
                  className={`w-2 h-2 rotate-45 transition-all duration-300 ${i === currentIndex ? 'bg-primary scale-125 shadow-[0_0_10px_rgba(var(--primary),0.5)]' : 'bg-outline-variant/40'}`}
                ></div>
              ))}
            </div>
          </div>
        </div>

        {/* Carousel Content */}
        <div className="relative h-[450px] flex items-center justify-center overflow-hidden">
          {/* Navigation Arrows */}
          <button 
            onClick={prevShip}
            className="absolute left-6 z-10 p-3 hover:bg-primary/10 rounded-full transition-colors text-primary/60 hover:text-primary"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          
          <button 
            onClick={nextShip}
            className="absolute right-6 z-10 p-3 hover:bg-primary/10 rounded-full transition-colors text-primary/60 hover:text-primary"
          >
            <ChevronRight className="w-8 h-8" />
          </button>

          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div 
              key={currentShip.id}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              onDragEnd={handleDragEnd}
              className="flex flex-col md:flex-row items-center gap-12 px-20 w-full cursor-grab active:cursor-grabbing"
            >
              {/* Ship Icon (Smaller & Practical) */}
              <div 
                className="w-48 h-48 flex-shrink-0 relative group cursor-pointer"
                onClick={() => onSelect(currentShip.id)}
              >
                {/* Decorative Rings */}
                <div className="absolute inset-0 border border-primary/10 rounded-full animate-spin-slow"></div>
                <div className="absolute inset-4 border border-primary/5 rounded-full animate-spin-slow" style={{ animationDirection: 'reverse' }}></div>
                
                {/* The Icon - Geometric Templates */}
                <div className="absolute inset-8 flex items-center justify-center overflow-hidden bg-black/40 rounded-xl border border-primary/30 shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-sm">
                  <div className="w-full h-full flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                    <svg viewBox="0 0 100 100" className="w-24 h-24 drop-shadow-[0_0_15px_rgba(var(--primary),0.8)]">
                      {currentShip.id === 'VOTIVE_ORB' && (
                        <circle cx="50" cy="50" r="35" fill="rgba(var(--primary), 0.2)" stroke="rgb(var(--primary))" strokeWidth="4" />
                      )}
                      {currentShip.id === 'PULSE_NODE' && (
                        <rect x="15" y="15" width="70" height="70" fill="rgba(var(--primary), 0.2)" stroke="rgb(var(--primary))" strokeWidth="4" />
                      )}
                      {currentShip.id === 'VOID_SPIRE' && (
                        <polygon points="50,15 85,80 15,80" fill="rgba(var(--primary), 0.2)" stroke="rgb(var(--primary))" strokeWidth="4" strokeLinejoin="round" />
                      )}
                    </svg>
                  </div>
                  {/* Scanline */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/20 to-transparent h-2 w-full animate-scanline pointer-events-none"></div>
                  
                  {/* Click to Select Overlay */}
                  <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="font-label text-[10px] tracking-widest uppercase text-surface font-bold">SELECT</span>
                  </div>
                </div>
              </div>

              {/* Ship Details */}
              <div className="flex-grow space-y-8 max-w-md">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-1.5 bg-primary/10 rounded text-primary">
                      {currentShip.icon}
                    </div>
                    <h2 className="font-headline text-3xl font-bold tracking-widest text-primary uppercase">{currentShip.name}</h2>
                  </div>
                  <p className="font-body text-sm text-outline leading-relaxed italic opacity-80">{currentShip.description}</p>
                </div>

                <div className="space-y-4">
                  <div className="font-label text-[10px] tracking-[0.3em] text-primary/70 uppercase border-b border-outline-variant/20 pb-2 flex justify-between items-center">
                    <span>Capabilities_Data</span>
                    <span className="text-[8px] opacity-50">v1.0.4</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-4 group/item">
                      <div className="w-1.5 h-1.5 bg-primary mt-1.5 rotate-45 group-hover/item:scale-150 transition-transform"></div>
                      <div className="flex flex-col">
                        <span className="font-label text-[9px] text-primary/60 uppercase tracking-wider mb-0.5">Primary_System</span>
                        <span className="font-body text-xs leading-tight text-surface-on-variant">{currentShip.abilities.primary}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 group/item">
                      <div className="w-1.5 h-1.5 bg-primary mt-1.5 rotate-45 group-hover/item:scale-150 transition-transform"></div>
                      <div className="flex flex-col">
                        <span className="font-label text-[9px] text-primary/60 uppercase tracking-wider mb-0.5">Alternate_System</span>
                        <span className="font-body text-xs leading-tight text-surface-on-variant">{currentShip.abilities.alternate}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 group/item">
                      <div className="w-1.5 h-1.5 bg-primary mt-1.5 rotate-45 group-hover/item:scale-150 transition-transform"></div>
                      <div className="flex flex-col">
                        <span className="font-label text-[9px] text-primary/60 uppercase tracking-wider mb-0.5">Special_Protocol</span>
                        <span className="font-body text-xs leading-tight text-surface-on-variant">{currentShip.abilities.special}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Action */}
        <div className="p-8 bg-surface-container-low border-t border-outline-variant/20 flex justify-between items-center">
          <div className="flex flex-col">
            <div className="font-label text-[10px] text-outline uppercase tracking-widest mb-1">
              Awaiting_Confirmation...
            </div>
            <div className="font-label text-[8px] text-primary/40 uppercase tracking-tighter">
              Swipe or use arrows to browse vessels
            </div>
          </div>
          <button 
            onClick={() => onSelect(currentShip.id)}
            className="group relative px-16 py-4 bg-primary text-surface font-label text-[12px] font-bold tracking-[0.4em] uppercase hover:bg-primary/90 transition-all overflow-hidden shadow-[0_0_20px_rgba(var(--primary),0.3)]"
          >
            <span className="relative z-10">SELECT SHIP</span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
