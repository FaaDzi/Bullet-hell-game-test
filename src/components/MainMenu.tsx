import React from 'react';
import { motion } from 'motion/react';
import { Play } from 'lucide-react';

interface MainMenuProps {
  onStart: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStart }) => {
  const [isLaunching, setIsLaunching] = React.useState(false);

  const handleStart = () => {
    if (isLaunching) return;
    setIsLaunching(true);
    // Delay the actual start to allow the animation to play
    setTimeout(() => {
      onStart();
    }, 1200);
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        handleStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLaunching, onStart]);

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface overflow-hidden">
      {/* Left Tear Panel */}
      <motion.div 
        className="absolute inset-y-0 left-0 w-1/2 bg-surface grid-bg border-r border-primary/10 z-20"
        animate={isLaunching ? { x: '-100%' } : { x: 0 }}
        transition={{ duration: 0.8, ease: [0.7, 0, 0.3, 1], delay: 0.4 }}
      />
      
      {/* Right Tear Panel */}
      <motion.div 
        className="absolute inset-y-0 right-0 w-1/2 bg-surface grid-bg border-l border-primary/10 z-20"
        animate={isLaunching ? { x: '100%' } : { x: 0 }}
        transition={{ duration: 0.8, ease: [0.7, 0, 0.3, 1], delay: 0.4 }}
      />

      {/* Content Container (Behind panels initially, but triangle is on top) */}
      <div className="relative z-30 flex flex-col items-center">
        {/* Center Geometric Unit */}
        <motion.div 
          className="relative group cursor-pointer mb-12 flex flex-col items-center"
          onClick={handleStart}
          animate={isLaunching ? { 
            y: [0, 40, -1200], 
            scale: [1, 0.8, 1.5],
            opacity: [1, 1, 0] 
          } : { y: 0, opacity: 1 }}
          transition={isLaunching ? { 
            duration: 1, 
            times: [0, 0.2, 1],
            ease: ["easeOut", "easeIn"]
          } : {}}
        >
          <motion.div 
            className="flex items-center justify-center relative"
            whileHover={{ rotate: -90, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            {/* The "Arrow" (Play Icon) */}
            <Play className="w-20 h-20 text-primary fill-primary relative z-10" />
            
            {/* Subtle Glow */}
            <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            {/* Engine Trail (Visible on hover/launch) */}
            <motion.div 
              className="absolute top-full left-1/2 -translate-x-1/2 w-1 bg-gradient-to-b from-primary to-transparent opacity-0 group-hover:opacity-100"
              initial={{ height: 0 }}
              whileHover={{ height: 100 }}
              animate={isLaunching ? { height: 400, opacity: 1 } : {}}
            ></motion.div>
          </motion.div>

          <motion.div 
            className="mt-12 font-label text-[10px] tracking-[0.5em] text-primary animate-pulse uppercase"
            animate={isLaunching ? { opacity: 0 } : { opacity: 1 }}
          >
            {isLaunching ? 'SYNC_INITIATED' : 'START / SELECT SHIP'}
          </motion.div>
        </motion.div>

        {/* Branding & CTA */}
        <motion.div 
          className="text-center flex flex-col items-center"
          animate={isLaunching ? { opacity: 0, scale: 0.9 } : { opacity: 1, scale: 1 }}
        >
          <h1 className="font-headline text-4xl md:text-6xl lg:text-7xl tracking-[-0.05em] uppercase font-bold text-primary mb-4">
            NON-EUCLIDEAN
          </h1>
          <p className="font-label text-[10px] md:text-xs tracking-[0.4em] uppercase text-secondary mb-12">
            Euclidean Space Detected... Transcending...
          </p>
        </motion.div>
      </div>

      {/* Asymmetrical Data Blocks */}
      <motion.div 
        className="absolute bottom-32 left-8 hidden lg:block border-l border-outline-variant/20 pl-4 py-2 z-30"
        animate={isLaunching ? { x: -100, opacity: 0 } : { x: 0, opacity: 1 }}
      >
        <div className="font-label text-[10px] text-secondary tracking-widest uppercase mb-1">Environmental Flux</div>
        <div className="h-[0.5px] w-24 bg-outline-variant/40 mb-2"></div>
        <div className="font-label text-xs font-bold">14.002 // 09.212</div>
      </motion.div>
      
      <motion.div 
        className="absolute top-1/2 right-12 hidden lg:block border-r border-outline-variant/20 pr-4 py-2 text-right z-30"
        animate={isLaunching ? { x: 100, opacity: 0 } : { x: 0, opacity: 1 }}
      >
        <div className="font-label text-[10px] text-secondary tracking-widest uppercase mb-1">Architecture Node</div>
        <div className="h-[0.5px] w-32 bg-outline-variant/40 mb-2 ml-auto"></div>
        <div className="font-label text-xs font-bold italic">UNSTABLE_GEOMETRY</div>
      </motion.div>
    </div>
  );
};
