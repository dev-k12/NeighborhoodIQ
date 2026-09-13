import React from 'react';
import { Compass, BarChart3, GitCompare, Moon, Sun, Layers } from 'lucide-react';
import LogoMark from './LogoMark';

export default function Navbar({ activePage, setActivePage, isDark, setIsDark }) {
  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-paper-border/80 dark:border-obsidian-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-2.5">
          {/* Brand Logo with Custom Magnifying Glass over India Map */}
          <div 
            onClick={() => setActivePage('home')}
            className="flex items-center space-x-3.5 cursor-pointer group select-none"
          >
            <LogoMark className="w-10 h-10" />

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg sm:text-xl font-extrabold tracking-tight text-paper-ink dark:text-obsidian-ink">
                  Neighborhood<span className="text-emerald-600 dark:text-emerald-400 font-black">·IQ</span>
                </span>
                <span className="hidden md:inline-flex items-center space-x-1 text-[9px] font-mono-meta font-bold uppercase px-2 py-0.5 rounded-md bg-paper-100 dark:bg-obsidian-850 text-paper-muted dark:text-obsidian-muted border border-paper-border dark:border-obsidian-800">
                  <span>OSM SPATIAL</span>
                </span>
              </div>
              <p className="text-[10px] font-mono-meta text-paper-muted dark:text-obsidian-muted uppercase tracking-widest hidden sm:block">
                National Urban Livability Archive
              </p>
            </div>
          </div>

          {/* Navigation links styled as tactile index tabs */}
          <div className="flex items-center space-x-1 sm:space-x-1.5">
            <button
              onClick={() => setActivePage('home')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activePage === 'home'
                  ? 'bg-paper-100 dark:bg-obsidian-850 text-paper-ink dark:text-white border border-paper-border dark:border-obsidian-800 shadow-xs'
                  : 'text-paper-muted dark:text-obsidian-muted hover:text-paper-ink dark:hover:text-white hover:bg-paper-100/60 dark:hover:bg-obsidian-850/50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activePage === 'home' ? 'bg-emerald-500' : 'bg-transparent'}`} />
              <span>Explore</span>
            </button>

            <button
              onClick={() => setActivePage('compare')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activePage === 'compare'
                  ? 'bg-paper-100 dark:bg-obsidian-850 text-paper-ink dark:text-white border border-paper-border dark:border-obsidian-800 shadow-xs'
                  : 'text-paper-muted dark:text-obsidian-muted hover:text-paper-ink dark:hover:text-white hover:bg-paper-100/60 dark:hover:bg-obsidian-850/50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activePage === 'compare' ? 'bg-emerald-500' : 'bg-transparent'}`} />
              <span>Compare</span>
            </button>

            <button
              onClick={() => setActivePage('insights')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activePage === 'insights'
                  ? 'bg-paper-100 dark:bg-obsidian-850 text-paper-ink dark:text-white border border-paper-border dark:border-obsidian-800 shadow-xs'
                  : 'text-paper-muted dark:text-obsidian-muted hover:text-paper-ink dark:hover:text-white hover:bg-paper-100/60 dark:hover:bg-obsidian-850/50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activePage === 'insights' ? 'bg-emerald-500' : 'bg-transparent'}`} />
              <span>Insights</span>
            </button>

            {/* Dark Mode Toggle */}
            <div className="pl-2 border-l border-paper-border dark:border-obsidian-800 ml-1">
              <button
                onClick={() => setIsDark(!isDark)}
                aria-label="Toggle dark mode"
                className="p-2 rounded-xl text-paper-muted dark:text-obsidian-muted hover:text-paper-ink dark:hover:text-white hover:bg-paper-100 dark:hover:bg-obsidian-850 transition-all"
              >
                {isDark ? (
                  <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
                ) : (
                  <Moon className="w-4 h-4 text-paper-ink hover:-rotate-12 transition-transform" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
