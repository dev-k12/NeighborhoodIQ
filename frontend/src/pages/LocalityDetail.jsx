import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, GitCompare, MapPin, Share2, Sparkles, Building2, Trees, Bus, HeartPulse, GraduationCap, Store, Shield, CheckCircle } from 'lucide-react';
import ScoreGauge from '../components/ScoreGauge';
import RadarChart from '../components/RadarChart';
import ClusterBadge from '../components/ClusterBadge';
import { getLocalityById } from '../api/client';

const METRIC_DETAILS = [
  { key: 'transit', label: 'Transit Access', icon: Bus, desc: 'Bus stops & railway/metro stations (deduplicated)' },
  { key: 'healthcare', label: 'Healthcare & Clinics', icon: HeartPulse, desc: 'Hospitals, clinics, and pharmacies' },
  { key: 'education', label: 'Education Institutions', icon: GraduationCap, desc: 'Schools, colleges, and educational facilities' },
  { key: 'green_space', label: 'Parks & Greenery', icon: Trees, desc: 'Public parks, gardens, and recreation spaces' },
  { key: 'amenity', label: 'Daily Amenities & Retail', icon: Store, desc: 'Supermarkets, dining, cafes, and marketplaces' },
  { key: 'safety_proxy', label: 'Civic Safety Proxy', icon: Shield, desc: 'Police stations within 1.5 km (civic proxy)' },
];

export default function LocalityDetail({ localityId, onBack, onCompare, isDark }) {
  const [locality, setLocality] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchDetail() {
      try {
        setLoading(true);
        const data = await getLocalityById(localityId);
        setLocality(data);
      } catch (err) {
        console.error('Error fetching locality details:', err);
      } finally {
        setLoading(false);
      }
    }
    if (localityId) fetchDetail();
  }, [localityId]);

  if (loading || !locality) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading locality livability dossier...</p>
      </div>
    );
  }

  const {
    name,
    city,
    state,
    latitude,
    longitude,
    quality_score,
    scores = {},
    counts = {},
    cluster,
    rank,
    total_localities,
    percentile,
    city_benchmarks = {},
  } = locality;

  // Radar dataset comparing Locality vs City Average
  const radarData = METRIC_DETAILS.map((m) => ({
    metric: m.label.split(' ')[0], // short label
    [name]: scores[m.key] || 0,
    [`${city} Avg`]: city_benchmarks[m.key] || 50,
  }));

  const handleDownloadReport = () => {
    // Triggers standard print dialog optimized via CSS print media styles
    window.print();
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 pb-20 print:p-0 print:space-y-4">
      {/* Top action bar */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-2 text-xs font-mono text-paper-muted dark:text-obsidian-muted hover:text-paper-ink dark:hover:text-white px-3.5 py-2 rounded-xl hover:bg-paper-200/60 dark:hover:bg-obsidian-800 transition-colors border border-transparent hover:border-paper-border dark:hover:border-obsidian-700 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← RETURN TO ARCHIVE</span>
        </button>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleShare}
            className="inline-flex items-center space-x-1.5 text-xs font-medium text-paper-ink dark:text-obsidian-ink hover:text-emerald-600 px-3.5 py-2 rounded-xl border border-paper-border dark:border-obsidian-800 bg-white dark:bg-obsidian-900 hover:bg-paper-100 dark:hover:bg-obsidian-800 transition-colors shadow-paper cursor-pointer"
          >
            {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? 'Link Copied' : 'Share Spec'}</span>
          </button>

          <button
            onClick={() => onCompare([localityId])}
            className="inline-flex items-center space-x-1.5 text-xs font-medium text-paper-ink dark:text-obsidian-ink hover:text-emerald-600 px-3.5 py-2 rounded-xl border border-paper-border dark:border-obsidian-800 bg-white dark:bg-obsidian-900 hover:bg-paper-100 dark:hover:bg-obsidian-800 transition-colors shadow-paper cursor-pointer"
          >
            <GitCompare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Compare</span>
          </button>

          <button
            onClick={handleDownloadReport}
            className="inline-flex items-center space-x-1.5 text-xs font-medium text-white bg-obsidian-950 hover:bg-emerald-600 dark:bg-white dark:text-obsidian-950 dark:hover:bg-emerald-400 px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Print Dossier (PDF)</span>
          </button>
        </div>
      </div>

      {/* Hero Dossier Card */}
      <div className="bg-paper-50 dark:bg-obsidian-900 rounded-3xl border border-paper-border dark:border-obsidian-800 p-6 sm:p-10 shadow-paper">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          {/* Title & Metadata */}
          <div className="space-y-4 max-w-xl">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-paper-200/80 dark:bg-obsidian-800 text-paper-ink dark:text-obsidian-ink border border-paper-border dark:border-obsidian-700">
                <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>{city.toUpperCase()}, {state.toUpperCase()}</span>
              </span>

              {rank && (
                <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold">
                  № {rank} OF {total_localities}
                </span>
              )}

              <span className="text-paper-muted dark:text-obsidian-muted">
                PERCENTILE: {Math.max(1, 100 - Math.round(percentile))}% TIER
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-serif tracking-tight text-paper-ink dark:text-white">
              {name}
            </h1>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <ClusterBadge cluster={cluster} size="md" />
              </div>
              <p className="text-sm text-paper-muted dark:text-obsidian-muted leading-relaxed font-sans">
                {cluster?.description || 'A well-balanced settlement evaluated against comprehensive 1,500m spatial OpenStreetMap containment.'}
              </p>
            </div>

            {/* Coordinates tag */}
            <div className="text-[11px] font-mono text-paper-muted dark:text-obsidian-muted pt-2 border-t border-paper-border dark:border-obsidian-800">
              COORDINATES: {latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E • 1,500M GAUSSIAN DENSITY BUFFER
            </div>
          </div>

          {/* Radial Score Gauge */}
          <div className="bg-white dark:bg-obsidian-950 p-7 rounded-2xl border border-paper-border dark:border-obsidian-800 shadow-paper flex flex-col items-center justify-center shrink-0 w-full lg:w-auto">
            <span className="text-[10px] font-mono tracking-widest text-paper-muted dark:text-obsidian-muted mb-3 uppercase">
              COMPOSITE QUALITY INDEX
            </span>
            <ScoreGauge score={quality_score} size={170} strokeWidth={11} />
          </div>
        </div>
      </div>

      {/* Two-Column Analytics: Multi-dimensional Radar vs City + Key Metric Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Radar Chart Panel */}
        <div className="bg-paper-50 dark:bg-obsidian-900 rounded-3xl border border-paper-border dark:border-obsidian-800 p-6 sm:p-7 shadow-paper flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-serif text-paper-ink dark:text-white">
                Multi-Dimensional <span className="italic">Footprint</span>
              </h3>
              <span className="text-xs font-mono text-paper-muted dark:text-obsidian-muted">
                NORMALIZED 0–100 SCALE
              </span>
            </div>
            <p className="text-xs text-paper-muted dark:text-obsidian-muted mb-4 font-sans">
              Comparing {name} (emerald) directly against {city} municipal benchmark (obsidian/slate).
            </p>
          </div>

          <div className="my-auto py-2">
            <RadarChart
              data={radarData}
              keys={[name, `${city} Avg`]}
              isDark={isDark}
              height={330}
            />
          </div>

          <div className="pt-3 border-t border-paper-border dark:border-obsidian-800 text-[11px] font-mono text-paper-muted dark:text-obsidian-muted flex items-center justify-between">
            <span>PERIMETER REPRESENTS MAXIMAL ACCESS DENSITY</span>
            <span>RADIUS: 1,500M</span>
          </div>
        </div>

        {/* 6 Dimension Stat Cards */}
        <div className="space-y-3">
          <h3 className="text-lg font-serif text-paper-ink dark:text-white mb-2">
            Infrastructure Dimension <span className="italic">Specs</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {METRIC_DETAILS.map((m) => {
              const Icon = m.icon;
              const countVal = counts[m.key] ?? 0;
              const scoreVal = scores[m.key] ?? 0;
              const cityAvg = city_benchmarks[m.key] ?? 50;
              const isAboveAvg = scoreVal >= cityAvg;

              return (
                <div
                  key={m.key}
                  className="p-4 rounded-2xl bg-white dark:bg-obsidian-900 border border-paper-border dark:border-obsidian-800 shadow-paper space-y-2 hover:border-emerald-500/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-paper-100 dark:bg-obsidian-800 text-emerald-600 dark:text-emerald-400">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                      SPEC: {scoreVal.toFixed(1)}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-paper-ink dark:text-obsidian-ink">
                      {m.label}
                    </h4>
                    <p className="text-[10px] text-paper-muted dark:text-obsidian-muted leading-tight font-sans">
                      {m.desc}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-paper-border dark:border-obsidian-800 flex items-end justify-between text-xs">
                    <div>
                      <span className="text-xl font-mono font-bold text-paper-ink dark:text-white">
                        {countVal}
                      </span>
                      <span className="text-[10px] font-mono text-paper-muted dark:text-obsidian-muted ml-1.5">nodes</span>
                    </div>

                    <span
                      className={`text-[10px] font-mono font-semibold ${
                        isAboveAvg ? 'text-emerald-600 dark:text-emerald-400' : 'text-paper-muted dark:text-obsidian-muted'
                      }`}
                    >
                      {isAboveAvg ? `+${(scoreVal - cityAvg).toFixed(0)} VS METRO` : `${(scoreVal - cityAvg).toFixed(0)} VS METRO`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
