import React from 'react';
import { Grid3X3, Settings } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  onSettingsClick?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, title = 'ARCHITECT_OS', onSettingsClick }) => {
  return (
    <div className="h-screen flex flex-col bg-surface text-on-surface font-body selection:bg-primary selection:text-surface overflow-hidden">
      {/* Top App Bar */}
      <header className="flex-none flex justify-between items-center px-8 py-4 w-full bg-surface border-b-[0.5px] border-outline-variant/20 z-50">
        <div className="text-xl font-bold tracking-tighter text-primary font-headline">{title}</div>
        <div className="flex items-center space-x-6">
          <button className="hover:bg-surface-container-low p-1 transition-all duration-150 active:opacity-70 active:scale-[0.99]">
            <Grid3X3 className="w-5 h-5 stroke-[1px]" />
          </button>
          <button 
            onClick={onSettingsClick}
            className="hover:bg-surface-container-low p-1 transition-all duration-150 active:opacity-70 active:scale-[0.99]"
          >
            <Settings className="w-5 h-5 stroke-[1px]" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        {children}
      </main>

      {/* Footer */}
      <footer className="flex-none flex flex-col md:flex-row justify-between items-center px-8 py-6 w-full bg-surface border-t-[0.5px] border-outline-variant/20 z-50">
        <div className="text-[10px] tracking-tight uppercase text-outline">
          © 2024 NON-EUCLIDEAN SYSTEMS. ALL COORDINATES VERIFIED.
        </div>
        <div className="flex gap-8 mt-4 md:mt-0">
          <a href="#" className="text-[10px] tracking-tight uppercase text-outline hover:text-primary transition-all">TERMINAL</a>
          <a href="#" className="text-[10px] tracking-tight uppercase text-outline hover:text-primary transition-all">LOGS</a>
          <a href="#" className="text-[10px] tracking-tight uppercase text-primary underline decoration-[0.5px]">PROTOCOL</a>
        </div>
      </footer>
    </div>
  );
};
