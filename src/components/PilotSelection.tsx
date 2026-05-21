import React from 'react';
import { motion } from 'motion/react';
import { Module } from '../types';

interface PilotSelectionProps {
  options: Module[];
  onSelect: (module: Module) => void;
}

export const PilotSelection: React.FC<PilotSelectionProps> = ({ options, onSelect }) => {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-8 bg-surface/80 backdrop-blur-md">
      {/* Central Module Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl h-[716px] flex flex-col bg-surface-container-lowest border-[0.5px] border-primary/20 p-12 relative"
      >
        {/* Corner Accents */}
        <div className="absolute -top-[1px] -left-[1px] w-4 h-4 border-t-[1.5px] border-l-[1.5px] border-primary"></div>
        <div className="absolute -bottom-[1px] -right-[1px] w-4 h-4 border-b-[1.5px] border-r-[1.5px] border-primary"></div>

        {/* Header */}
        <div className="mb-12 flex justify-between items-baseline border-b-[0.5px] border-outline-variant pb-4">
          <h1 className="font-headline text-2xl font-bold tracking-tight uppercase">SYNCING MODULES...</h1>
          <div className="font-label text-[10px] tracking-widest text-outline">VERSION_4.0.ALPHA</div>
        </div>

        {/* Three Choices: Asymmetric Grid */}
        <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-0">
          {options.map((module, index) => {
            const rarityColor = module.rarity === 'LEGENDARY' ? 'text-primary' : module.rarity === 'RARE' ? 'text-primary/80' : 'text-outline';
            const rarityBorder = module.rarity === 'LEGENDARY' ? 'border-primary shadow-[0_0_20px_rgba(var(--primary),0.2)]' : module.rarity === 'RARE' ? 'border-primary/50' : 'border-outline-variant/30';

            return (
              <button 
                key={module.id + index}
                onClick={() => onSelect(module)}
                className={`group flex flex-col p-8 border-r-[0.5px] ${rarityBorder} text-left transition-all duration-300 hover:bg-surface-container-low focus:outline-none relative`}
              >
                <div className="mb-auto">
                  <div className="font-label text-[9px] tracking-widest mb-4 opacity-50 uppercase">
                    {module.rarity} // MODULE_0{index + 1}
                  </div>
                  
                  <div className="w-20 h-20 mb-12 flex items-center justify-center">
                    {/* Geometric Wireframe Icon */}
                    <svg height="60" viewbox="0 0 60 60" width="60" className="wireframe-stroke">
                      {module.type === 'REFRACTION' && <polygon points="30,5 55,50 5,50" />}
                      {module.type === 'KINETIC' && <rect x="10" y="10" width="40" height="40" />}
                      {module.type === 'OVERCLOCK' && <circle cx="30" cy="30" r="25" />}
                      {module.type === 'REPAIR' && <path d="M30 10 L30 50 M10 30 L50 30" strokeWidth="2" />}
                      {module.type === 'SHIELD' && <path d="M10 15 Q30 5 50 15 L50 40 Q30 55 10 40 Z" strokeWidth="2" />}
                    </svg>
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-2">
                    <h2 className={`font-headline text-xl font-bold tracking-tighter uppercase ${rarityColor}`}>
                      {module.name}
                    </h2>
                  </div>
                  <p className="font-body text-xs text-on-surface-variant leading-relaxed max-w-[200px]">
                    {module.description}
                  </p>
                </div>

                <div className="mt-12 flex items-center space-x-2">
                  <div className="h-1 w-1 group-hover:w-8 bg-primary transition-all duration-300"></div>
                  <span className="font-label text-[10px] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    INSTALL_UNIT
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Data Bar */}
        <div className="mt-12 flex justify-between items-center text-[9px] font-label text-outline uppercase tracking-widest border-t-[0.5px] border-outline-variant/30 pt-6">
          <div className="flex space-x-8">
            <span>SYS_RESOURCES: [||||||||||--] 82%</span>
            <span>COOLANT_LVL: OPTIMAL</span>
          </div>
          <div>PRESS [SPACE] TO CONFIRM SELECTION</div>
        </div>
      </motion.div>

      {/* Decorative HUD Elements */}
      <div className="absolute bottom-10 left-10 flex flex-col space-y-2">
        <div className="w-48 h-[0.5px] bg-primary/20"></div>
        <div className="w-32 h-[0.5px] bg-primary/20"></div>
        <div className="font-label text-[10px] text-outline">NEURAL_LINK_STABLE</div>
      </div>
      <div className="absolute top-24 right-10 rotate-90 origin-right">
        <div className="font-headline text-xs tracking-[1em] text-primary/40">NON-EUCLIDEAN_INTERFACE</div>
      </div>
    </div>
  );
};
