import React from 'react';
import { X, Monitor, Keyboard, Info, Music } from 'lucide-react';
import { audioService } from '../services/audioService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  scale: number;
  onScaleChange: (scale: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, scale, onScaleChange }) => {
  if (!isOpen) return null;

  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      audioService.playMusic(url);
    }
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-surface/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-surface-container-lowest border-[0.5px] border-primary/20 shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b-[0.5px] border-outline-variant/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center border border-primary rotate-45">
              <div className="-rotate-45">
                <Monitor className="w-4 h-4" />
              </div>
            </div>
            <h2 className="font-headline text-xl font-bold tracking-tight uppercase">SYSTEM_CONFIGURATION</h2>
          </div>
          <button onClick={onClose} className="hover:bg-surface-container-low p-2 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-10 max-h-[70vh] overflow-y-auto">
          {/* Screen Scaling */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Monitor className="w-4 h-4 text-outline" />
              <h3 className="font-label text-[10px] tracking-[0.2em] text-outline uppercase font-bold">Display_Scaling</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-baseline">
                <span className="font-body text-sm">Scale Factor</span>
                <span className="font-mono text-xs text-primary">{Math.round(scale * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0.5" 
                max="1.5" 
                step="0.05" 
                value={scale} 
                onChange={(e) => onScaleChange(parseFloat(e.target.value))}
                className="w-full h-[2px] bg-outline-variant/30 appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[9px] font-mono text-outline uppercase">
                <span>0.5x</span>
                <span>1.0x (Default)</span>
                <span>1.5x</span>
              </div>
            </div>
          </section>

          {/* Music Configuration */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Music className="w-4 h-4 text-outline" />
              <h3 className="font-label text-[10px] tracking-[0.2em] text-outline uppercase font-bold">Audio_Protocols</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-baseline">
                <span className="font-body text-sm">Dynamic Music Override</span>
                <span className="font-mono text-[10px] text-outline uppercase">MP3_SUPPORTED</span>
              </div>
              <label className="flex items-center justify-center w-full h-12 border-[0.5px] border-dashed border-outline-variant/40 hover:border-primary transition-colors cursor-pointer">
                <span className="font-label text-[10px] tracking-widest uppercase text-outline">LOAD_EXTERNAL_MP3</span>
                <input 
                  type="file" 
                  accept="audio/mp3" 
                  className="hidden" 
                  onChange={handleMusicUpload}
                />
              </label>
            </div>
          </section>

          {/* Controls */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Keyboard className="w-4 h-4 text-outline" />
              <h3 className="font-label text-[10px] tracking-[0.2em] text-outline uppercase font-bold">Input_Protocols</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border-[0.5px] border-outline-variant/20 bg-surface-container-low">
                <div className="font-label text-[9px] text-outline mb-2 uppercase">Movement</div>
                <div className="font-headline text-sm">W, A, S, D</div>
              </div>
              <div className="p-4 border-[0.5px] border-outline-variant/20 bg-surface-container-low">
                <div className="font-label text-[9px] text-outline mb-2 uppercase">Focus / Slow</div>
                <div className="font-headline text-sm">HOLD SHIFT</div>
              </div>
              <div className="p-4 border-[0.5px] border-outline-variant/20 bg-surface-container-low">
                <div className="font-label text-[9px] text-outline mb-2 uppercase">Fire Mode</div>
                <div className="font-headline text-sm">ALT</div>
              </div>
              <div className="p-4 border-[0.5px] border-outline-variant/20 bg-surface-container-low">
                <div className="font-label text-[9px] text-outline mb-2 uppercase">Special</div>
                <div className="font-headline text-sm">SPACEBAR</div>
              </div>
              <div className="p-4 border-[0.5px] border-outline-variant/20 bg-surface-container-low col-span-2">
                <div className="font-label text-[9px] text-outline mb-2 uppercase">Attack</div>
                <div className="font-headline text-sm">AUTO-FIRE (ALWAYS ON)</div>
              </div>
            </div>
          </section>

          {/* System Info */}
          <section className="pt-6 border-t-[0.5px] border-outline-variant/20">
            <div className="flex items-start gap-4">
              <Info className="w-4 h-4 text-primary mt-1" />
              <div className="space-y-1">
                <p className="font-body text-xs leading-relaxed text-on-surface-variant">
                  Architecture optimized for non-Euclidean traversal. If display skews on tablet devices, adjust the scale factor to normalize the viewport.
                </p>
                <p className="font-label text-[9px] text-outline uppercase tracking-widest">
                  BUILD_REF: 2024.03.30.ALPHA
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 bg-surface-container-low flex justify-end">
          <button 
            onClick={onClose}
            className="px-8 py-2 border border-primary font-label text-[10px] tracking-widest uppercase hover:bg-primary hover:text-surface transition-all"
          >
            APPLY_CHANGES
          </button>
        </div>
      </div>
    </div>
  );
};
