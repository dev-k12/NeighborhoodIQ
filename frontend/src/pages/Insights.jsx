import React, { useState, useEffect, useTransition } from 'react';
import {
  BarChart3,
  Sliders,
  Layers,
  Network,
  TrendingUp,
  RotateCcw,
  Sparkles,
  Info,
  Building,
} from 'lucide-react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import WeightSliders from '../components/WeightSliders';
import ClusterBadge from '../components/ClusterBadge';
import {
  getCorrelation,
  getClusters,
  recalculateScores,
  getDefaultWeights,
  getEda,
} from '../api/client';

export default function Insights({ onSelectLocality, isDark }) {
  const [weights, setWeights] = useState({
    healthcare: 0.20,
    education: 0.15,
    green_space: 0.15,
    transit: 0.20,
    amenity: 0.15,
    safety_proxy: 0.15,
  });

  const [leaderboard, setLeaderboard] = useState([]);
  const [correlationData, setCorrelationData] = useState(null);
  const [clusterData, setClusterData] = useState(null);
  const [edaData, setEdaData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load initial insights datasets
  useEffect(() => {
    async function loadAllInsights() {
      try {
        setLoading(true);
        const [wRes, corrRes, clusRes, edaRes] = await Promise.all([
          getDefaultWeights(),
          getCorrelation(),
          getClusters(),
          getEda(),
        ]);

        if (wRes.weights) setWeights(wRes.weights);
        setCorrelationData(corrRes);
        setClusterData(clusRes);
        setEdaData(edaRes);

        // Initial leaderboard from weights
        const reRes = await recalculateScores(wRes.weights || weights);
        setLeaderboard(reRes.localities || []);
      } catch (err) {
        console.error('Error fetching insights:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAllInsights();
  }, []);

  // Handle live weight slider adjustments
  const handleWeightChange = async (newWeights) => {
    setWeights(newWeights);
    try {
      const res = await recalculateScores(newWeights);
      setLeaderboard(res.localities || []);
    } catch (err) {
      console.error('Error recalculating scores on weight change:', err);
    }
  };

  const handleResetWeights = async () => {
    try {
      const wRes = await getDefaultWeights();
      const defW = wRes.weights || {
        healthcare: 0.20,
        education: 0.15,
        green_space: 0.15,
        transit: 0.20,
        amenity: 0.15,
        safety_proxy: 0.15,
      };
      setWeights(defW);
      const res = await recalculateScores(defW);
      setLeaderboard(res.localities || []);
    } catch (err) {
      console.error('Error resetting weights:', err);
    }
  };

  // Helper for correlation cell color
  const getCorrColor = (val) => {
    if (val === 1.0) return isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500';
    if (val >= 0.5) return 'bg-emerald-500 text-white font-bold';
    if (val >= 0.2) return 'bg-emerald-200 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-300';
    if (val > -0.2) return isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600';
    if (val > -0.5) return 'bg-rose-200 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300';
    return 'bg-rose-500 text-white font-bold';
  };

  return (
    <div className="space-y-12 pb-24">
      {/* Header */}
      <div className="border-b border-paper-border dark:border-obsidian-800 pb-6">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-mono mb-2 border border-emerald-500/20">
          <BarChart3 className="w-3.5 h-3.5" />
          <span>STATISTICAL & MACHINE LEARNING BENCHMARK</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif tracking-tight text-paper-ink dark:text-white">
          Urban Data Science <span className="italic">Laboratory</span>
        </h1>
        <p className="text-xs sm:text-sm text-paper-muted dark:text-obsidian-muted font-sans mt-1">
          Unsupervised clustering archetypes, Pearson parameter correlations, and real-time sensitivity scoring over authentic OpenStreetMap observations.
        </p>
      </div>

      {/* SECTION 1: Live Interactive Weight Customizer & Dynamic Leaderboard */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-serif text-paper-ink dark:text-white flex items-center space-x-2.5">
            <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>01 • Interactive Weight Matrix & <span className="italic">Dynamic Re-Ranking</span></span>
          </h2>
          <p className="text-xs text-paper-muted dark:text-obsidian-muted font-sans mt-0.5">
            Adjust dimensional coefficients to calibrate preferences. Observe live vector recalculation across the nationwide catalog.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sliders (7 cols) */}
          <div className="lg:col-span-7">
            <WeightSliders
              weights={weights}
              onWeightChange={handleWeightChange}
              onReset={handleResetWeights}
            />
          </div>

          {/* Dynamic Re-ranked Leaderboard (5 cols) */}
          <div className="lg:col-span-5 bg-paper-50 dark:bg-obsidian-900 rounded-3xl border border-paper-border dark:border-obsidian-800 p-6 shadow-paper flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-paper-border dark:border-obsidian-800 font-mono">
                <span className="text-xs font-bold text-paper-ink dark:text-white flex items-center space-x-2">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>CALIBRATED LEADERBOARD</span>
                </span>
                <span className="text-[10px] text-paper-muted dark:text-obsidian-muted uppercase">
                  Top 8 Settlements
                </span>
              </div>

              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {leaderboard.slice(0, 8).map((loc, idx) => (
                  <div
                    key={loc.id}
                    onClick={() => onSelectLocality(loc.id)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white dark:hover:bg-obsidian-800 cursor-pointer transition-all border border-transparent hover:border-paper-border dark:hover:border-obsidian-700 group"
                  >
                    <div className="flex items-center space-x-3">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-[10px] ${
                          idx === 0
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                            : idx === 1
                            ? 'bg-paper-200 text-paper-ink dark:bg-obsidian-800 dark:text-obsidian-muted'
                            : idx === 2
                            ? 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30'
                            : 'text-paper-muted dark:text-obsidian-muted font-mono'
                        }`}
                      >
                        №{idx + 1}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-paper-ink dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {loc.name}
                        </h4>
                        <span className="text-[10px] font-mono text-paper-muted dark:text-obsidian-muted uppercase">{loc.city}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <ClusterBadge cluster={loc.cluster} showIcon={false} size="sm" />
                      <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        {loc.quality_score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-paper-border dark:border-obsidian-800 text-[11px] font-mono text-paper-muted dark:text-obsidian-muted text-center">
              Recomputed across all localities via weighted dot-product projection.
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: 2D PCA Cluster Scatter Plot & Archetypes */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-serif text-paper-ink dark:text-white flex items-center space-x-2.5">
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>02 • KMeans Archetype Clustering & <span className="italic">2D PCA Projection</span></span>
          </h2>
          <p className="text-xs text-paper-muted dark:text-obsidian-muted font-sans mt-0.5">
            StandardScaler + KMeans (k=4) identifies natural urban archetypes from the 6-dimensional feature space.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 2D PCA Scatter Chart */}
          <div className="lg:col-span-7 bg-paper-50 dark:bg-obsidian-900 rounded-3xl border border-paper-border dark:border-obsidian-800 p-6 sm:p-7 shadow-paper">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-serif font-bold text-paper-ink dark:text-white">
                PCA 2D Component Projection
              </h3>
              <span className="text-xs font-mono text-paper-muted dark:text-obsidian-muted">
                EXPLAINED VARIANCE: {clusterData?.pca_variance_ratio ? `${Math.round((clusterData.pca_variance_ratio[0] + clusterData.pca_variance_ratio[1]) * 100)}%` : '68%'}
              </span>
            </div>
            <p className="text-xs text-paper-muted dark:text-obsidian-muted mb-4 font-sans">
              Settlements closer together share similar infrastructure profiles across healthcare, transit, and parks.
            </p>

            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 15, right: 15, bottom: 15, left: 15 }}>
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="PCA 1 (Density & Connectivity)"
                    stroke={isDark ? '#64748b' : '#94a3b8'}
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="PCA 2 (Greenery vs Retail)"
                    stroke={isDark ? '#64748b' : '#94a3b8'}
                    fontSize={10}
                    tickLine={false}
                  />
                  <ZAxis range={[70, 70]} />
                  <RechartsTooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ payload }) => {
                      if (!payload || !payload.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="p-3 rounded-xl bg-obsidian-950 text-white text-xs shadow-xl border border-obsidian-800 space-y-1 font-mono">
                          <p className="font-bold text-emerald-400">{data.name} ({data.city})</p>
                          <p className="text-obsidian-muted text-[11px]">{data.cluster_label}</p>
                          <p className="text-obsidian-muted text-[10px]">Quality Spec: {data.quality_score}</p>
                        </div>
                      );
                    }}
                  />
                  <Scatter
                    data={clusterData?.scatter_points || []}
                    onClick={(entry) => onSelectLocality(entry.id)}
                    className="cursor-pointer"
                  >
                    {(clusterData?.scatter_points || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#10B981'} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cluster Archetype Descriptions */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-paper-muted dark:text-obsidian-muted">
              ARCHETYPE CENTROID DEFINITIONS
            </h3>

            {(clusterData?.clusters || []).map((cl) => (
              <div
                key={cl.id}
                className="p-4 rounded-2xl bg-white dark:bg-obsidian-900 border border-paper-border dark:border-obsidian-800 shadow-paper space-y-2"
              >
                <div className="flex items-center justify-between">
                  <ClusterBadge cluster={cl} size="sm" />
                  <span className="text-[10px] font-mono font-bold text-paper-muted dark:text-obsidian-muted">
                    {cl.size} settlements
                  </span>
                </div>
                <p className="text-xs text-paper-muted dark:text-obsidian-muted leading-relaxed font-sans">
                  {cl.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 3: Pearson Correlation Heatmap */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-serif text-paper-ink dark:text-white flex items-center space-x-2.5">
            <Network className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>03 • Pearson Infrastructure <span className="italic">Correlation Matrix</span></span>
          </h2>
          <p className="text-xs text-paper-muted dark:text-obsidian-muted font-sans mt-0.5">
            Measures bivariate linear relationships between civic infrastructure dimensions across the national dataset.
          </p>
        </div>

        <div className="bg-paper-50 dark:bg-obsidian-900 rounded-3xl border border-paper-border dark:border-obsidian-800 p-6 sm:p-8 shadow-paper">
          {correlationData && correlationData.variables?.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                <table className="border-collapse text-xs font-mono">
                  <thead>
                    <tr>
                      <th className="p-2.5 text-left text-paper-muted dark:text-obsidian-muted font-semibold"></th>
                      {correlationData.variables.map((v) => (
                        <th
                          key={v}
                          className="p-2.5 text-center text-paper-ink dark:text-white font-bold whitespace-nowrap min-w-[90px]"
                        >
                          {v}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {correlationData.variables.map((rowVar, rIdx) => (
                      <tr key={rowVar}>
                        <td className="p-2.5 text-left font-bold text-paper-ink dark:text-white whitespace-nowrap">
                          {rowVar}
                        </td>
                        {correlationData.matrix[rIdx]?.map((val, cIdx) => (
                          <td key={cIdx} className="p-1.5 text-center">
                            <div
                              title={`${rowVar} ↔ ${correlationData.variables[cIdx]}: r = ${val}`}
                              className={`w-16 h-10 mx-auto rounded-xl flex items-center justify-center text-xs transition-transform hover:scale-105 select-none ${getCorrColor(
                                val
                              )}`}
                            >
                              {val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Interpretation guidelines */}
              <div className="mt-6 pt-5 border-t border-paper-border dark:border-obsidian-800 grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs text-paper-muted dark:text-obsidian-muted font-sans">
                <div className="p-3 rounded-xl bg-white dark:bg-obsidian-950 border border-paper-border dark:border-obsidian-800 shadow-paper">
                  <strong className="text-emerald-600 dark:text-emerald-400 block mb-1 font-mono">High Positive (r &gt; 0.4):</strong>
                  Strong co-location, such as transit nodes and retail amenities clustering together.
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-obsidian-950 border border-paper-border dark:border-obsidian-800 shadow-paper">
                  <strong className="text-paper-ink dark:text-white block mb-1 font-mono">Neutral (-0.2 to 0.2):</strong>
                  Independent civic infrastructure placement without direct spatial interaction.
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-obsidian-950 border border-paper-border dark:border-obsidian-800 shadow-paper">
                  <strong className="text-rose-600 dark:text-rose-400 block mb-1 font-mono">Negative (r &lt; -0.2):</strong>
                  Spatial trade-offs, where hyper-dense commercial cores have less dedicated park acreage.
                </div>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-xs font-mono text-paper-muted dark:text-obsidian-muted">
              COMPUTING CORRELATION MATRIX FROM REPOSITORIES...
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4: City-Level EDA Statistics */}
      {edaData && edaData.by_city && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-serif text-paper-ink dark:text-white flex items-center space-x-2.5">
              <Building className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>04 • Metropolitan Baseline <span className="italic">Benchmarks</span></span>
            </h2>
            <p className="text-xs text-paper-muted dark:text-obsidian-muted font-sans mt-0.5">
              Statistical dispersion metrics across top surveyed metropolitan clusters.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Object.entries(edaData.by_city).map(([cityName, stats]) => (
              <div
                key={cityName}
                className="p-5 rounded-3xl bg-paper-50 dark:bg-obsidian-900 border border-paper-border dark:border-obsidian-800 shadow-paper space-y-2 hover:border-emerald-500/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-paper-ink dark:text-white">
                    {cityName}
                  </h4>
                  <span className="text-[10px] font-mono text-paper-muted dark:text-obsidian-muted bg-paper-200/80 dark:bg-obsidian-800 px-2 py-0.5 rounded-md">
                    {stats.locality_count} nodes
                  </span>
                </div>

                <div>
                  <span className="text-3xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {stats.quality_score?.mean || 0}
                  </span>
                  <span className="text-[10px] font-mono text-paper-muted dark:text-obsidian-muted ml-1.5">MEAN SPEC</span>
                </div>

                <div className="pt-2.5 border-t border-paper-border dark:border-obsidian-800 text-[11px] font-mono text-paper-muted dark:text-obsidian-muted space-y-1">
                  <div className="flex justify-between">
                    <span>MEDIAN:</span>
                    <span className="font-semibold text-paper-ink dark:text-white">{stats.quality_score?.median}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>STD DEV:</span>
                    <span className="font-semibold text-paper-ink dark:text-white">±{stats.quality_score?.std}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>RANGE:</span>
                    <span className="font-semibold text-paper-ink dark:text-white">{stats.quality_score?.min}–{stats.quality_score?.max}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
