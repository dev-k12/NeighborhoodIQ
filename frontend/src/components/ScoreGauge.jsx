import React from 'react';

export default function ScoreGauge({ score = 0, size = 160, strokeWidth = 10, showLabel = true }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  // Grade classification
  const getGrade = (val) => {
    if (val >= 82) return { text: 'Tier 1 Prime Index', grade: 'A+', color: 'text-emerald-600 dark:text-emerald-400', stroke: '#10B981' };
    if (val >= 72) return { text: 'High Livability Spec', grade: 'A', color: 'text-emerald-600 dark:text-emerald-400', stroke: '#059669' };
    if (val >= 60) return { text: 'Balanced Urban Node', grade: 'B+', color: 'text-amber-600 dark:text-amber-400', stroke: '#D97706' };
    if (val >= 48) return { text: 'Moderate Growth Zone', grade: 'B', color: 'text-amber-600 dark:text-amber-400', stroke: '#D97706' };
    return { text: 'Developing Civic Grid', grade: 'C', color: 'text-stone-500 dark:text-stone-400', stroke: '#78716C' };
  };

  const gradeInfo = getGrade(clampedScore);

  return (
    <div className="relative inline-flex flex-col items-center justify-center select-none">
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id="editorialGaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>

        {/* Track background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-paper-200 dark:text-obsidian-800 fill-none"
        />

        {/* Precision Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#editorialGaugeGrad)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="fill-none transition-all duration-1000 ease-out"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span className="text-3xl font-mono font-bold tracking-tight text-paper-ink dark:text-white">
          {score.toFixed(1)}
        </span>
        <span className="text-[10px] font-mono tracking-widest uppercase text-paper-muted dark:text-obsidian-muted mt-0.5">
          / 100 SPEC
        </span>
        <div className="mt-1 px-2 py-0.5 rounded-md bg-paper-200/80 dark:bg-obsidian-800 text-[10px] font-mono font-bold text-paper-ink dark:text-obsidian-ink border border-paper-border dark:border-obsidian-700">
          RANK {gradeInfo.grade}
        </div>
      </div>

      {showLabel && (
        <div className="mt-2.5 text-center">
          <span className={`text-xs font-serif italic font-medium ${gradeInfo.color}`}>
            {gradeInfo.text}
          </span>
        </div>
      )}
    </div>
  );
}
