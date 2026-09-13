import React from 'react';
import { MapPin, Bus, HeartPulse, Trees, ChevronRight, CheckCircle2 } from 'lucide-react';
import ClusterBadge from './ClusterBadge';

export default function LocalityCard({
  locality,
  onSelect,
  isCompared = false,
  onToggleCompare = null,
}) {
  const {
    id,
    name,
    city,
    district,
    state,
    quality_score,
    cluster,
    counts = {},
    rank,
    is_seed,
  } = locality;

  const getScoreBadge = (score) => {
    if (score >= 80) return 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
    if (score >= 70) return 'bg-teal-50 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border-teal-300 dark:border-teal-800';
    if (score >= 60) return 'bg-blue-50 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-800';
    if (score >= 50) return 'bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800';
    return 'bg-rose-50 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-800';
  };

  return (
    <div className="group relative bg-white dark:bg-obsidian-900 rounded-2xl border border-paper-border dark:border-obsidian-800 p-5 shadow-paper hover-lift hover:border-emerald-600/40 dark:hover:border-emerald-500/40 transition-all flex flex-col justify-between">
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            {/* Index Spec Number & Location */}
            <div className="flex items-center space-x-2 text-xs mb-1.5">
              <span className="font-mono-meta text-[10px] font-bold text-paper-muted dark:text-obsidian-muted uppercase tracking-wider">
                № {rank ? String(rank).padStart(2, '0') : '00'}
              </span>
              <span className="text-paper-border dark:text-obsidian-700">•</span>
              <span className="font-medium text-[11px] text-paper-muted dark:text-obsidian-muted truncate">
                {city}{district && district.toLowerCase() !== city.toLowerCase() ? ` (${district})` : ''}
              </span>
            </div>

            <h3
              onClick={() => onSelect && onSelect(id)}
              className="text-base sm:text-lg font-bold text-paper-ink dark:text-obsidian-ink truncate hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer transition-colors"
            >
              {name}
            </h3>
          </div>

          {/* Quality Score Badge */}
          <div className="shrink-0 text-right">
            <div
              className={`px-2.5 py-1 rounded-xl font-mono font-black text-sm sm:text-base border shadow-xs ${getScoreBadge(
                quality_score
              )}`}
            >
              {quality_score.toFixed(1)}
            </div>
            <span className="block text-[9px] font-mono-meta text-paper-muted dark:text-obsidian-muted mt-0.5 uppercase">
              INDEX / 100
            </span>
          </div>
        </div>

        {/* Archetype cluster badge & Sparse Data Tag */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <ClusterBadge cluster={cluster} size="sm" />
          {((counts.transit || 0) + (counts.green_space || 0) + (counts.healthcare || 0) + (counts.education || 0) + (counts.amenity || 0) + (counts.safety_proxy || 0) === 0 || locality.is_sparse) && (
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25">
              Sparse OSM Data
            </span>
          )}
        </div>

        {/* Real Counts Snapshot Grid */}
        <div className="grid grid-cols-3 gap-2 py-3 px-3.5 rounded-xl bg-paper-50 dark:bg-obsidian-950 border border-paper-border/80 dark:border-obsidian-800 text-xs mb-4">
          <div className="flex flex-col">
            <span className="text-paper-muted dark:text-obsidian-muted text-[10px] font-mono-meta uppercase flex items-center gap-1">
              <Bus className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Transit
            </span>
            <span className="font-mono font-bold text-paper-ink dark:text-obsidian-ink text-sm mt-0.5">
              {counts.transit ?? 0}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-paper-muted dark:text-obsidian-muted text-[10px] font-mono-meta uppercase flex items-center gap-1">
              <Trees className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Parks
            </span>
            <span className="font-mono font-bold text-paper-ink dark:text-obsidian-ink text-sm mt-0.5">
              {counts.green_space ?? 0}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-paper-muted dark:text-obsidian-muted text-[10px] font-mono-meta uppercase flex items-center gap-1">
              <HeartPulse className="w-3 h-3 text-rose-600 dark:text-rose-400" /> Clinics
            </span>
            <span className="font-mono font-bold text-paper-ink dark:text-obsidian-ink text-sm mt-0.5">
              {counts.healthcare ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-paper-border/80 dark:border-obsidian-800">
        {onToggleCompare && (
          <button
            onClick={() => onToggleCompare(id)}
            className={`flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${
              isCompared
                ? 'bg-paper-ink text-white dark:bg-white dark:text-obsidian-950 shadow-xs'
                : 'text-paper-muted dark:text-obsidian-muted hover:text-paper-ink dark:hover:text-white hover:bg-paper-100 dark:hover:bg-obsidian-800'
            }`}
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${isCompared ? 'text-emerald-400 dark:text-emerald-600' : 'text-paper-muted dark:text-obsidian-muted'}`} />
            <span>{isCompared ? 'Selected' : 'Compare'}</span>
          </button>
        )}

        <button
          onClick={() => onSelect && onSelect(id)}
          className="ml-auto flex items-center space-x-1 text-xs font-bold text-paper-ink dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 group-hover:translate-x-0.5 transition-all"
        >
          <span>Inspect Spec</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
