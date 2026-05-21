import React from 'react';
import { motion } from 'motion/react';
import { Player } from '../types';

interface WaveCompleteProps {
  player: Player;
  onContinue: () => void;
  onAbort: () => void;
}

export const WaveComplete: React.FC<WaveCompleteProps> = ({ player, onContinue, onAbort }) => {
  return (
    <div className="absolute inset-0 z-20 flex flex-col px-8 md:px-24 pt-12 pb-24 max-w-7xl mx-auto w-full bg-surface">
      {/* Hero State Transition */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-20"
      >
        <h1 className="font-headline font-light text-[4rem] md:text-[7rem] leading-none tracking-tight text-primary uppercase">
          STAGE_COMPLETE
        </h1>
        <div className="flex items-center gap-4 mt-4">
          <div className="h-[0.5px] bg-outline-variant w-32"></div>
          <span className="font-label text-xs tracking-[0.3em] text-outline">SESSION_LOG_STAMP: 0XF4E2</span>
        </div>
      </motion.div>

      {/* Asymmetric Data Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Primary Metrics */}
        <div className="lg:col-span-5 space-y-12">
          <div className="space-y-8">
            <div className="group">
              <p className="font-label text-[10px] text-outline mb-1">SECTOR_ID</p>
              <p className="font-headline text-3xl font-light">VOID_CONDUIT_7</p>
            </div>
            <div className="group">
              <p className="font-label text-[10px] text-outline mb-1">ENTITIES_REMOVED</p>
              <p className="font-headline text-3xl font-light">{player.kills} <span className="text-sm text-outline ml-2">/ KILLS</span></p>
            </div>
            <div className="group">
              <p className="font-label text-[10px] text-outline mb-1">DAMAGE_SUSTAINED</p>
              <p className="font-headline text-3xl font-light">{player.damageTaken} <span className="text-sm text-outline ml-2">/ HP</span></p>
            </div>
            <div className="group">
              <p className="font-label text-[10px] text-outline mb-1">SYNC_RATE</p>
              <p className="font-headline text-3xl font-light text-primary">{player.syncRate}%</p>
            </div>
          </div>
          {/* Ghost Vectors / Decoration */}
          <div className="hidden lg:block pt-12">
            <svg className="stroke-outline/20 fill-none" height="200" viewbox="0 0 100 100" width="200">
              <circle cx="50" cy="50" r="48" strokeDasharray="2 2"></circle>
              <path d="M50 2 L50 98 M2 50 L98 50"></path>
              <rect height="50" transform="rotate(45 50 50)" width="50" x="25" y="25"></rect>
            </svg>
          </div>
        </div>

        {/* Progression & Abstract Visualization */}
        <div className="lg:col-span-7 bg-surface-container-low p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <span className="font-label text-[9px] text-outline vertical-text rotate-90 origin-right">DATA_VISUALIZATION_V2.1</span>
          </div>
          <div className="space-y-16 relative z-10">
            {/* XP Bar Charts */}
            <div className="space-y-8">
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="font-label text-xs uppercase tracking-widest">Architect_Experience</span>
                  <span className="font-label text-xs">LVL {player.level}</span>
                </div>
                <div className="h-1 w-full bg-outline-variant/30 relative">
                  <div className="absolute inset-y-0 left-0 bg-primary w-3/4"></div>
                </div>
                <div className="flex justify-between">
                  <span className="font-label text-[10px] text-outline uppercase">+2,400 UNITS</span>
                  <span className="font-label text-[10px] text-outline uppercase">NEXT_REACH: 3,000</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="font-label text-xs uppercase tracking-widest">System_Integration</span>
                  <span className="font-label text-xs">{player.integrity}%</span>
                </div>
                <div className="h-1 w-full bg-outline-variant/30 relative">
                  <div className="absolute inset-y-0 left-0 bg-primary w-[92%]"></div>
                </div>
                <div className="flex justify-between">
                  <span className="font-label text-[10px] text-outline uppercase">PROTOCOL_STABLE</span>
                  <span className="font-label text-[10px] text-outline uppercase">BUFFERING...</span>
                </div>
              </div>
            </div>
            {/* Abstract Grid Overlay */}
            <div className="h-48 w-full border-[0.5px] border-outline/20 grid grid-cols-12 grid-rows-6 opacity-30">
              <div className="border-[0.5px] border-outline/10 bg-primary/5"></div>
              <div className="border-[0.5px] border-outline/10"></div>
              <div className="border-[0.5px] border-outline/10"></div>
              <div className="border-[0.5px] border-outline/10 bg-primary/10"></div>
              <div className="border-[0.5px] border-outline/10"></div>
              <div className="border-[0.5px] border-outline/10"></div>
              <div className="border-[0.5px] border-outline/10"></div>
              <div className="border-[0.5px] border-outline/10"></div>
              <div className="border-[0.5px] border-outline/10 bg-primary/20"></div>
              <div className="border-[0.5px] border-outline/10"></div>
              <div className="border-[0.5px] border-outline/10"></div>
              <div className="border-[0.5px] border-outline/10"></div>
              <div className="col-span-12 row-span-5 flex items-center justify-center">
                <div className="w-full h-full bg-primary/5 flex items-center justify-center">
                  <span className="font-headline text-xs opacity-20">GEOMETRIC_RECONSTRUCTION_IN_PROGRESS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Section */}
      <div className="mt-20 flex flex-col md:flex-row gap-8 items-center border-t border-outline-variant/20 pt-12">
        <button 
          onClick={onContinue}
          className="w-full md:w-auto px-12 py-4 border border-primary font-label text-xs tracking-widest uppercase hover:bg-primary hover:text-on-primary transition-all duration-300"
        >
          CONTINUE_SYNC
        </button>
        <button 
          onClick={onAbort}
          className="w-full md:w-auto font-label text-xs tracking-widest uppercase relative after:content-[''] after:absolute after:bottom-[-2px] after:left-[-10px] after:right-[-10px] after:h-[0.5px] after:bg-outline hover:text-error transition-all duration-300"
        >
          ABORT_SESSION
        </button>
      </div>
    </div>
  );
};
