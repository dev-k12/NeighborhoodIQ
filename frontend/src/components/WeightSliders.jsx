import React from 'react';
import { Sliders, RotateCcw, HeartPulse, GraduationCap, Trees, Bus, Store, Shield } from 'lucide-react';

const ICONS = {
  healthcare: HeartPulse,
  education: GraduationCap,
  green_space: Trees,
  transit: Bus,
  amenity: Store,
  safety_proxy: Shield,
};

const LABELS = {
  healthcare: 'Healthcare',
  education: 'Education',
  green_space: 'Parks & Green',
  transit: 'Public Transit',
  amenity: 'Amenities & Retail',
  safety_proxy: 'Civic Safety Proxy',
};

export default function WeightSliders({ weights, onWeightChange, onReset, isCompact = false }) {
  const sumWeights = Object.values(weights).reduce((acc, v) => acc + (Number(v) || 0), 0) || 1;

  const handleSliderChange = (key, rawVal) => {
    const val = parseFloat(rawVal) / 100.0;
    const updated = { ...weights, [key]: val };
    onWeightChange(updated);
  };

  return (
    <div className="bg-paper-50 dark:bg-obsidian-900 rounded-3xl p-6 border border-paper-border dark:border-obsidian-800 shadow-paper">
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-paper-border dark:border-obsidian-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-paper-200/80 dark:bg-obsidian-800 text-emerald-600 dark:text-emerald-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-serif font-bold text-paper-ink dark:text-white">
              Civic Weight Allocation Matrix
            </h3>
            <p className="text-[11px] font-sans text-paper-muted dark:text-obsidian-muted">
              Adjust dimensional coefficients to calibrate real-time index rankings
            </p>
          </div>
        </div>

        <button
          onClick={onReset}
          className="flex items-center space-x-1.5 text-xs font-mono text-paper-muted dark:text-obsidian-muted hover:text-emerald-600 dark:hover:text-emerald-400 px-3 py-1.5 rounded-lg hover:bg-paper-200/60 dark:hover:bg-obsidian-800 transition-colors border border-transparent hover:border-paper-border dark:hover:border-obsidian-700 cursor-pointer"
          title="Reset to default urban science weights"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">RESET (PCA OPTIMAL)</span>
        </button>
      </div>

      <div className={`grid gap-3.5 ${isCompact ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
        {Object.keys(weights).map((key) => {
          const Icon = ICONS[key] || Sliders;
          const currentVal = weights[key] || 0;
          const pct = Math.round((currentVal / sumWeights) * 100);

          return (
            <div key={key} className="space-y-2 p-3 rounded-2xl bg-white dark:bg-obsidian-950 border border-paper-border dark:border-obsidian-800 shadow-paper">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium font-sans text-paper-ink dark:text-obsidian-ink flex items-center space-x-2">
                  <Icon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{LABELS[key] || key}</span>
                </span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md text-[11px] border border-emerald-500/20">
                  {pct}%
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={Math.round(currentVal * 100)}
                onChange={(e) => handleSliderChange(key, e.target.value)}
                className="w-full h-1.5 bg-paper-200 dark:bg-obsidian-800 rounded-lg appearance-none cursor-pointer accent-emerald-600 dark:accent-emerald-400 transition-all"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
