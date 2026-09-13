import React, { useState, useEffect } from 'react';
import { GitCompare, Plus, X, Award, CheckCircle2, ChevronDown, Sparkles, Bus, HeartPulse, GraduationCap, Trees, Store, Shield, AlertCircle } from 'lucide-react';
import RadarChart from '../components/RadarChart';
import ClusterBadge from '../components/ClusterBadge';
import { compareLocalities, getLocalities } from '../api/client';

const METRIC_ROWS = [
  { key: 'transit', label: 'Transit Access', icon: Bus },
  { key: 'healthcare', label: 'Healthcare & Clinics', icon: HeartPulse },
  { key: 'education', label: 'Education & Schools', icon: GraduationCap },
  { key: 'green_space', label: 'Parks & Greenery', icon: Trees },
  { key: 'amenity', label: 'Amenities & Retail', icon: Store },
  { key: 'safety_proxy', label: 'Civic Safety Proxy', icon: Shield },
];

export default function Compare({ selectedIds = [], setSelectedIds, onSelectLocality, isDark }) {
  const [allLocalities, setAllLocalities] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  // Auto-dismiss notification after 4s
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Load all localities for the dropdown selector
  useEffect(() => {
    async function loadAll() {
      try {
        const res = await getLocalities({ sort_by: 'name', order: 'asc' });
        setAllLocalities(res.localities || []);
        // If no selected IDs, default to first 2 localities
        if ((!selectedIds || selectedIds.length < 2) && res.localities?.length >= 2) {
          setSelectedIds([res.localities[0].id, res.localities[1].id]);
        }
      } catch (err) {
        console.error('Error fetching locality list for compare:', err);
      }
    }
    loadAll();
  }, []);

  // Fetch comparison data whenever selectedIds change
  useEffect(() => {
    async function fetchComparison() {
      if (!selectedIds || selectedIds.length < 2) {
        setComparisonData(null);
        return;
      }
      try {
        setLoading(true);
        const data = await compareLocalities(selectedIds);
        setComparisonData(data);
      } catch (err) {
        console.error('Error fetching comparison data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchComparison();
  }, [selectedIds]);

  const addLocality = (id) => {
    const loc = allLocalities.find((l) => l.id === id);
    const locName = loc ? loc.name : 'This locality';

    if (selectedIds.includes(id)) {
      setNotification({
        type: 'warning',
        message: `Settlement "${locName}" is already active in your comparative ledger.`
      });
      setPickerOpen(false);
      return;
    }
    if (selectedIds.length >= 4) {
      setNotification({
        type: 'warning',
        message: 'Comparative ledger is capped at 4 settlements simultaneously. Remove one to add another.'
      });
      setPickerOpen(false);
      return;
    }
    setNotification(null);
    setSelectedIds([...selectedIds, id]);
    setPickerOpen(false);
  };

  const removeLocality = (id) => {
    if (selectedIds.length <= 2) {
      setNotification({
        type: 'warning',
        message: 'A minimum of 2 settlements is required for side-by-side comparative ledger analysis.'
      });
      return;
    }
    setNotification(null);
    setSelectedIds(selectedIds.filter((item) => item !== id));
  };

  const localityNames = comparisonData?.localities?.map((l) => l.name) || [];

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 border-b border-paper-border dark:border-obsidian-800 pb-6">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-mono mb-2 border border-emerald-500/20">
            <GitCompare className="w-3.5 h-3.5" />
            <span>CROSS-TERRITORY SPATIAL MATRIX</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif tracking-tight text-paper-ink dark:text-white">
            Comparative Settlement <span className="italic">Ledger</span>
          </h1>
          <p className="text-xs sm:text-sm text-paper-muted dark:text-obsidian-muted font-sans mt-1">
            Juxtapose genuine 1,500m OpenStreetMap infrastructure densities between 2–4 localities simultaneously.
          </p>
        </div>

        {/* Locality Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setPickerOpen(!pickerOpen)}
            disabled={selectedIds.length >= 4}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-obsidian-950 hover:bg-emerald-600 dark:bg-white dark:text-obsidian-950 dark:hover:bg-emerald-400 disabled:opacity-50 text-white font-medium text-xs shadow-paper transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Settlement ({selectedIds.length}/4)</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>

          {pickerOpen && (
            <div className="absolute right-0 mt-2 w-72 max-h-72 overflow-y-auto rounded-2xl bg-white dark:bg-obsidian-900 border border-paper-border dark:border-obsidian-800 shadow-paper-hover z-30 p-2 space-y-1">
              {allLocalities.map((loc) => {
                const isAlreadySelected = selectedIds.includes(loc.id);
                return (
                  <button
                    key={loc.id}
                    onClick={() => addLocality(loc.id)}
                    className={`w-full text-left px-3.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isAlreadySelected
                        ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30'
                        : 'hover:bg-paper-100 dark:hover:bg-obsidian-800'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-paper-ink dark:text-obsidian-ink">{loc.name}</span>
                      <span className="text-[10px] font-mono text-paper-muted dark:text-obsidian-muted ml-1.5">({loc.city})</span>
                    </div>
                    {isAlreadySelected ? (
                      <span className="text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                        Active In Ledger
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        {loc.quality_score.toFixed(1)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Inline Notification Banner */}
      {notification && (
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-mono shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-semibold">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 hover:bg-amber-500/20 rounded-md transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {loading && !comparisonData ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-paper-muted dark:text-obsidian-muted">ALIGNING MULTI-LOCALITY SPATIAL MATRICES...</p>
        </div>
      ) : !comparisonData ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-paper-border dark:border-obsidian-800 text-xs font-mono text-paper-muted dark:text-obsidian-muted">
          SELECT AT LEAST 2 LOCALITIES TO INITIATE CROSS-ANALYSIS.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Localities Chips */}
          <div className="flex flex-wrap gap-3">
            {comparisonData.localities.map((loc, idx) => {
              const borderColors = [
                'border-emerald-500 dark:border-emerald-400',
                'border-sky-500 dark:border-sky-400',
                'border-amber-500 dark:border-amber-400',
                'border-purple-500 dark:border-purple-400'
              ];
              return (
                <div
                  key={loc.id}
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded-2xl bg-paper-50 dark:bg-obsidian-900 border ${borderColors[idx % borderColors.length]} shadow-paper`}
                >
                  <div>
                    <span className="text-xs font-bold text-paper-ink dark:text-white">{loc.name}</span>
                    <span className="text-[10px] font-mono text-paper-muted dark:text-obsidian-muted ml-1.5 uppercase">({loc.city})</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    {loc.quality_score.toFixed(1)}
                  </span>
                  {selectedIds.length > 2 && (
                    <button
                      onClick={() => removeLocality(loc.id)}
                      className="p-1 hover:bg-paper-200 dark:hover:bg-obsidian-800 rounded-full text-paper-muted dark:text-obsidian-muted hover:text-paper-ink transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Overlapping Radar Chart */}
          <div className="bg-paper-50 dark:bg-obsidian-900 rounded-3xl border border-paper-border dark:border-obsidian-800 p-6 sm:p-8 shadow-paper">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-serif text-paper-ink dark:text-white">
                  Multi-Coordinate <span className="italic">Radar Overlay</span>
                </h3>
                <p className="text-xs text-paper-muted dark:text-obsidian-muted font-sans mt-0.5">
                  Direct superposition of normalized scores across all 6 civic dimensions.
                </p>
              </div>
            </div>

            <RadarChart
              data={comparisonData.radar_data}
              keys={localityNames}
              isDark={isDark}
              height={360}
            />
          </div>

          {/* Side-by-Side Comparative Table */}
          <div className="bg-paper-50 dark:bg-obsidian-900 rounded-3xl border border-paper-border dark:border-obsidian-800 overflow-hidden shadow-paper">
            <div className="p-6 border-b border-paper-border dark:border-obsidian-800">
              <h3 className="text-lg font-serif text-paper-ink dark:text-white">
                Infrastructure <span className="italic">Dimension Matrix</span>
              </h3>
              <p className="text-xs text-paper-muted dark:text-obsidian-muted font-sans mt-0.5">
                Exact physical feature counts within 1,500m radius and normalized index ratings.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="bg-paper-100 dark:bg-obsidian-950 border-b border-paper-border dark:border-obsidian-800 font-mono">
                    <th className="py-4 px-6 font-semibold uppercase tracking-wider text-paper-muted dark:text-obsidian-muted">
                      CIVIC DIMENSION
                    </th>
                    {comparisonData.localities.map((loc) => (
                      <th key={loc.id} className="py-4 px-6 font-bold text-paper-ink dark:text-white">
                        <div className="space-y-0.5">
                          <span
                            onClick={() => onSelectLocality(loc.id)}
                            className="cursor-pointer hover:text-emerald-600 transition-colors underline decoration-dotted decoration-paper-muted"
                          >
                            {loc.name}
                          </span>
                          <div className="text-[10px] font-normal text-paper-muted dark:text-obsidian-muted uppercase">
                            {loc.city}, {loc.state}
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-paper-border dark:divide-obsidian-800 font-mono">
                  {/* Quality Score Row */}
                  <tr className="bg-paper-200/50 dark:bg-obsidian-800/40 font-bold">
                    <td className="py-4 px-6 text-paper-ink dark:text-white flex items-center space-x-2">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-sans font-bold">Composite Quality Index</span>
                    </td>
                    {comparisonData.localities.map((loc) => (
                      <td key={loc.id} className="py-4 px-6">
                        <span className="text-base font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {loc.quality_score.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-paper-muted dark:text-obsidian-muted ml-1">/ 100</span>
                      </td>
                    ))}
                  </tr>

                  {/* Archetype Cluster Row */}
                  <tr>
                    <td className="py-4 px-6 font-medium text-paper-muted dark:text-obsidian-muted font-sans">
                      Cluster Archetype
                    </td>
                    {comparisonData.localities.map((loc) => (
                      <td key={loc.id} className="py-4 px-6">
                        <ClusterBadge cluster={loc.cluster} size="sm" />
                      </td>
                    ))}
                  </tr>

                  {/* Metric Rows */}
                  {METRIC_ROWS.map((m) => {
                    const winner = comparisonData.category_winners[m.key];
                    return (
                      <tr key={m.key} className="hover:bg-white dark:hover:bg-obsidian-800/50 transition-colors">
                        <td className="py-4 px-6 font-medium text-paper-ink dark:text-obsidian-ink flex items-center space-x-2.5 font-sans">
                          <m.icon className="w-4 h-4 text-paper-muted dark:text-obsidian-muted" />
                          <span>{m.label}</span>
                        </td>

                        {comparisonData.localities.map((loc) => {
                          const count = loc.counts[m.key] ?? 0;
                          const score = loc.scores[m.key] ?? 0;
                          const isWinner = winner?.winner_id === loc.id;

                          return (
                            <td key={loc.id} className="py-4 px-6">
                              <div className="flex items-center space-x-2.5">
                                <div>
                                  <span className="font-bold text-paper-ink dark:text-white text-sm">
                                    {score.toFixed(1)}
                                  </span>
                                  <span className="text-[10px] text-paper-muted dark:text-obsidian-muted block font-sans">
                                    {count} real entities
                                  </span>
                                </div>
                                {isWinner && (
                                  <span
                                    title="Category Leader"
                                    className="p-1 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                  >
                                    <Award className="w-3.5 h-3.5" />
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
