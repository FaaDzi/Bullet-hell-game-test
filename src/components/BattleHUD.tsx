import React from 'react';
import { Player } from '../types';

interface BattleHUDProps {
  player: Player;
  bossHealth?: number;
}

export const BattleHUD: React.FC<BattleHUDProps> = ({ player, bossHealth }) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* TOP LEFT: RANK & STAGE */}
      <div className="absolute top-8 left-8 flex flex-col gap-1">
        <div className="flex items-baseline gap-3">
          <span className="font-headline text-[10px] tracking-[0.2em] text-outline uppercase">Auth_Level</span>
          <span className="w-16 h-[0.5px] bg-outline-variant"></span>
        </div>
        <div className="font-headline text-2xl font-light tracking-widest text-primary uppercase">RANK: {player.rank}</div>
        <div className="font-headline text-xs tracking-[0.5em] text-outline uppercase mt-1">STAGE_0{player.level}</div>
        
        {/* SHIP ICON */}
        <div className="mt-4 w-16 h-16 border border-outline-variant/20 bg-black overflow-hidden relative flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-10 h-10 drop-shadow-[0_0_10px_rgba(var(--primary),0.8)]">
            {player.shipType === 'VOTIVE_ORB' && (
              <circle cx="50" cy="50" r="35" fill="rgba(var(--primary), 0.2)" stroke="rgb(var(--primary))" strokeWidth="4" />
            )}
            {player.shipType === 'PULSE_NODE' && (
              <rect x="15" y="15" width="70" height="70" fill="rgba(var(--primary), 0.2)" stroke="rgb(var(--primary))" strokeWidth="4" />
            )}
            {player.shipType === 'VOID_SPIRE' && (
              <polygon points="50,15 85,80 15,80" fill="rgba(var(--primary), 0.2)" stroke="rgb(var(--primary))" strokeWidth="4" strokeLinejoin="round" />
            )}
          </svg>
        </div>

        {/* SPECIAL METER */}
        <div className="flex flex-col gap-1 mt-6 w-48">
          <div className="flex justify-between items-baseline">
            <span className="font-headline text-[9px] tracking-[0.2em] text-outline uppercase">
            {player.shipType === 'PULSE_NODE' ? 'Dash_Charge' : 'Special_Meter'}
          </span>
            <span className="font-headline text-[10px] tracking-widest text-primary font-bold">{Math.floor(player.specialMeter)}%</span>
          </div>
          <div className="w-full h-[4px] bg-surface-container-high relative border border-outline-variant/20">
            <div 
              className={`absolute top-0 left-0 h-full transition-all duration-300 ${player.specialMeter >= 50 ? 'bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]' : 'bg-outline'}`} 
              style={{ width: `${player.specialMeter}%` }}
            ></div>
            {player.specialMeter >= 50 && (
              <div className="absolute -right-1 -top-1 w-2 h-2 bg-primary rotate-45 animate-ping"></div>
            )}
          </div>
          {player.specialMeter >= 50 && (
            <span className="font-label text-[8px] text-primary uppercase tracking-widest animate-pulse mt-1">
              {player.shipType === 'PULSE_NODE' ? 'CHARGED_DASH [SPACE]' : 'SPECIAL_READY [SPACE]'}
            </span>
          )}
        </div>

        {/* FIRE MODE */}
        <div className="mt-4 flex flex-col gap-1">
          <span className="font-headline text-[9px] tracking-[0.2em] text-outline uppercase">Fire_Mode</span>
          <div className="flex items-center gap-3">
            <div className={`px-2 py-0.5 border ${player.fireMode === 'PRIMARY' ? 'bg-primary text-on-primary border-primary' : 'border-outline text-outline'} text-[9px] font-bold tracking-widest transition-all`}>
              PRIMARY
            </div>
            <div className={`px-2 py-0.5 border ${player.fireMode === 'ALTERNATE' ? 'bg-primary text-on-primary border-primary' : 'border-outline text-outline'} text-[9px] font-bold tracking-widest transition-all`}>
              ALTERNATE
            </div>
            <span className="font-label text-[8px] text-outline-variant uppercase ml-2">[ALT]/[CAPS] TO SWITCH</span>
          </div>
        </div>
      </div>

      {/* TOP RIGHT: SYSTEM STATUS */}
      <div className="absolute top-8 right-8 text-right">
        <div className="font-headline text-[10px] tracking-[0.2em] text-outline uppercase mb-2">Internal_State</div>
        <div className="flex items-center justify-end gap-3">
          <div className="font-headline text-xs tracking-tighter text-on-surface uppercase">STATUS: OPERATIONAL</div>
          <div className="w-2 h-2 border border-primary rotate-45"></div>
        </div>
        <div className="mt-4 flex flex-col items-end gap-1">
          <div className="w-32 h-[1px] bg-outline-variant/20"></div>
          <div className="w-24 h-[1px] bg-outline-variant/40"></div>
          <div className="w-16 h-[1px] bg-outline-variant/60"></div>
        </div>
      </div>

      {/* BOSS HEALTH (IF APPLICABLE) */}
      {bossHealth !== undefined && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[600px]">
          <div className="flex justify-between items-end mb-1">
            <span className="font-label text-[10px] tracking-[0.2em] text-primary font-bold uppercase">Boss_Integrity</span>
            <span className="font-label text-[10px] tracking-[0.2em] text-primary">{bossHealth.toFixed(2)}%</span>
          </div>
          <div className="w-full h-[3px] bg-surface-container-high relative">
            <div className="absolute top-0 left-0 h-full bg-primary transition-all duration-300" style={{ width: `${bossHealth}%` }}></div>
          </div>
        </div>
      )}

      {/* BOTTOM LEFT: COORDINATE HUD */}
      <div className="absolute bottom-12 left-8 flex items-end gap-6">
        <div className="relative w-24 h-24 border-[0.5px] border-outline-variant rounded-full flex items-center justify-center">
          <div className="absolute w-full h-[0.5px] bg-outline-variant/20"></div>
          <div className="absolute h-full w-[0.5px] bg-outline-variant/20"></div>
          <span className="font-label text-[8px] uppercase tracking-tighter text-outline absolute -top-4">North_A</span>
          <div className="w-1 h-1 bg-primary rotate-45"></div>
          <div className="absolute w-20 h-20 border-[0.5px] border-primary/10 rounded-full animate-pulse"></div>
        </div>
        <div className="flex flex-col font-label text-[10px] tracking-widest text-outline">
          <span>X_POS: {player.pos.x.toFixed(4)}</span>
          <span>Y_POS: {player.pos.y.toFixed(4)}</span>
          <span>Z_POS: NULL</span>
        </div>
      </div>

      {/* BOTTOM RIGHT: INTEGRITY SYNC */}
      <div className="absolute bottom-12 right-8 flex flex-col items-end">
        <div className="flex flex-col items-end gap-2 w-64">
          <div className="flex justify-between w-full items-baseline">
            <span className="font-headline text-[10px] tracking-[0.2em] text-outline uppercase">Integrity_Sync</span>
            <span className="font-headline text-xs tracking-widest text-primary font-bold">{player.integrity}%</span>
          </div>
          <div className="w-full h-[2px] bg-outline-variant/20 relative">
            <div className="absolute top-0 left-0 h-full bg-primary transition-all duration-300" style={{ width: `${player.integrity}%` }}></div>
          </div>
        </div>
      </div>

      {/* ASYMMETRIC FLOATING DECOR */}
      <div className="absolute top-1/2 left-12 transform -translate-y-1/2 opacity-20 hidden lg:block">
        <div className="w-[0.5px] h-64 bg-primary"></div>
        <div className="font-label text-[9px] vertical-text uppercase tracking-[0.5em] mt-4">Vector_Alignment_Active</div>
      </div>
    </div>
  );
};
