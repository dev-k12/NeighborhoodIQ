import React, { useState, useEffect } from 'react';
import {
  MapPin,
  ChevronRight,
  Sparkles,
  Search,
  Loader2,
  Building2,
  CheckCircle2,
  Compass,
  ArrowRight,
  TrendingUp,
  Layers,
  AlertCircle,
  Play,
  Activity,
  HeartPulse,
  TreePine,
  Bus
} from 'lucide-react';
import {
  getGeoStates,
  getGeoDistricts,
  getGeoCities,
  scoreGeoLocality,
  getDistrictSummary,
  batchScoreDistrict
} from '../api/client';

export default function GeoSearchEngine({ onSelectLocality, onLocalityAdded }) {
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [cities, setCities] = useState([]);

  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [customCityName, setCustomCityName] = useState('');
  const [cityFilterQuery, setCityFilterQuery] = useState('');

  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [scoringCityName, setScoringCityName] = useState(null);

  // Batch scoring & District Summary states
  const [districtSummary, setDistrictSummary] = useState(null);
  const [batchScoring, setBatchScoring] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, cityName: '' });

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(null);

  // Load States on mount
  useEffect(() => {
    async function loadStates() {
      try {
        setLoadingStates(true);
        const res = await getGeoStates();
        setStates(res.states || []);
        // Pre-select Uttar Pradesh as an intuitive default
        if (res.states?.includes('Uttar Pradesh')) {
          setSelectedState('Uttar Pradesh');
        } else if (res.states?.length > 0) {
          setSelectedState(res.states[0]);
        }
      } catch (err) {
        console.error('Failed to load states:', err);
      } finally {
        setLoadingStates(false);
      }
    }
    loadStates();
  }, []);

  // When State changes, load its Districts
  useEffect(() => {
    if (!selectedState) return;
    async function loadDistricts() {
      try {
        setLoadingDistricts(true);
        setSelectedDistrict('');
        setCities([]);
        setDistrictSummary(null);
        setError('');
        const res = await getGeoDistricts(selectedState);
        const distList = res.districts || [];
        setDistricts(distList);

        // Pre-select Bulandshahr if in UP, or first district
        if (selectedState === 'Uttar Pradesh' && distList.includes('Bulandshahr')) {
          setSelectedDistrict('Bulandshahr');
        } else if (distList.length > 0) {
          setSelectedDistrict(distList[0]);
        }
      } catch (err) {
        console.error('Failed to load districts:', err);
      } finally {
        setLoadingDistricts(false);
      }
    }
    loadDistricts();
  }, [selectedState]);

  // Load District Summary helper
  const fetchSummary = async (st, dist) => {
    try {
      const sumRes = await getDistrictSummary(st, dist);
      setDistrictSummary(sumRes);
    } catch (err) {
      console.warn('Failed to load district summary:', err);
    }
  };

  // When District changes, load its Cities/Localities & District Summary
  useEffect(() => {
    if (!selectedState || !selectedDistrict) return;
    async function loadCities() {
      try {
        setLoadingCities(true);
        setError('');
        setCityFilterQuery('');
        const [citiesRes, _] = await Promise.all([
          getGeoCities(selectedState, selectedDistrict),
          fetchSummary(selectedState, selectedDistrict)
        ]);
        setCities(citiesRes.cities || []);
      } catch (err) {
        console.error('Failed to load cities:', err);
      } finally {
        setLoadingCities(false);
      }
    }
    loadCities();
  }, [selectedState, selectedDistrict]);

  // Handle scoring a city/town live via OSM
  const handleScoreLive = async (cityName) => {
    if (!cityName?.trim()) return;
    const cleanName = cityName.trim();

    try {
      setScoringCityName(cleanName);
      setError('');
      setSuccessMessage(null);

      const result = await scoreGeoLocality(cleanName, selectedDistrict, selectedState);
      setSuccessMessage(result);

      // Update the cities list in-place so this city shows as scored with its genuine metrics
      setCities((prev) =>
        prev.map((c) =>
          c.name.toLowerCase() === cleanName.toLowerCase()
            ? {
                ...c,
                is_scored: true,
                locality_id: result.id,
                quality_score: result.quality_score,
                cluster_label: result.cluster?.label || result.cluster_label,
                counts: result.counts,
              }
            : c
        )
      );

      // Notify parent home page to update localities grid & leaderboard
      if (onLocalityAdded) {
        onLocalityAdded(result);
      }
      setCustomCityName('');
      fetchSummary(selectedState, selectedDistrict);
    } catch (err) {
      console.error('Scoring error:', err);
      setError(
        err.response?.data?.detail ||
          `Failed to score "${cleanName}" via OpenStreetMap. Please check spelling or retry in a few moments.`
      );
    } finally {
      setScoringCityName(null);
    }
  };

  // Handle 1-Click Score All Cities in District
  const handleScoreAllCities = async () => {
    const unscored = cities.filter((c) => !c.is_scored);
    if (unscored.length === 0) return;

    setBatchScoring(true);
    setError('');
    setBatchProgress({ current: 0, total: unscored.length, cityName: unscored[0].name });

    for (let i = 0; i < unscored.length; i++) {
      const cityToScore = unscored[i];
      setBatchProgress({ current: i + 1, total: unscored.length, cityName: cityToScore.name });
      try {
        const result = await scoreGeoLocality(cityToScore.name, selectedDistrict, selectedState);
        setCities((prev) =>
          prev.map((c) =>
            c.name.toLowerCase() === cityToScore.name.toLowerCase()
              ? {
                  ...c,
                  is_scored: true,
                  locality_id: result.id,
                  quality_score: result.quality_score,
                  cluster_label: result.cluster?.label || result.cluster_label,
                  counts: result.counts,
                }
              : c
          )
        );
        if (onLocalityAdded) {
          onLocalityAdded(result);
        }
      } catch (err) {
        console.warn(`Could not batch score ${cityToScore.name}:`, err);
      }
    }

    setBatchScoring(false);
    fetchSummary(selectedState, selectedDistrict);
  };

  return (
    <div className="rounded-3xl bg-paper-50 dark:bg-obsidian-900 border border-paper-border dark:border-obsidian-800 shadow-paper overflow-hidden transition-colors">
      {/* Header Banner */}
      <div className="bg-obsidian-950 text-white p-6 sm:p-8 border-b border-obsidian-800 relative overflow-hidden">
        {/* Subtle decorative coordinate grid background */}
        <div className="absolute inset-0 bg-blueprint-grid opacity-10 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>ARCHIVE INDEX • 36 STATES & UTs • 450+ DISTRICTS • 2,600+ SETTLEMENTS</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-serif tracking-tight text-white">
              Sovereign Territorial <span className="italic text-emerald-400 font-normal">Catalog</span>
            </h2>
            <p className="text-xs sm:text-sm text-obsidian-muted max-w-2xl font-sans leading-relaxed">
              Navigate hierarchy from <strong className="text-obsidian-ink font-mono font-medium">State → District → Locality</strong>. Every municipal coordinate query executes genuine OpenStreetMap spatial boundary calculations with zero synthetic interpolation.
            </p>
          </div>

          {/* Step Breadcrumb Indicators */}
          <div className="flex items-center space-x-2 text-xs font-mono shrink-0">
            <span
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                selectedState
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-xs'
                  : 'bg-obsidian-900 border-obsidian-800 text-obsidian-muted'
              }`}
            >
              01 STATE ({states.length})
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-obsidian-muted" />
            <span
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                selectedDistrict
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-xs'
                  : 'bg-obsidian-900 border-obsidian-800 text-obsidian-muted'
              }`}
            >
              02 DIST ({districts.length})
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-obsidian-muted" />
            <span
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                cities.length > 0
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-xs'
                  : 'bg-obsidian-900 border-obsidian-800 text-obsidian-muted'
              }`}
            >
              03 TOWNS ({cities.length})
            </span>
          </div>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Step 1: Select State */}
          <div className="space-y-2">
            <label className="block text-xs font-mono uppercase tracking-wider text-paper-muted dark:text-obsidian-muted flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="font-semibold text-paper-ink dark:text-obsidian-ink">01 • STATE / UNION TERRITORY</span>
              </span>
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">{states.length} Jurisdictions</span>
            </label>
            <div className="relative">
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                disabled={loadingStates}
                className="w-full px-4 py-3 rounded-xl border border-paper-border dark:border-obsidian-800 bg-white dark:bg-obsidian-950 text-paper-ink dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all shadow-paper cursor-pointer"
              >
                {states.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Step 2: Select District */}
          <div className="space-y-2">
            <label className="block text-xs font-mono uppercase tracking-wider text-paper-muted dark:text-obsidian-muted flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="font-semibold text-paper-ink dark:text-obsidian-ink">02 • REVENUE DISTRICT</span>
              </span>
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">{districts.length} in {selectedState}</span>
            </label>
            <div className="relative">
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                disabled={loadingDistricts || districts.length === 0}
                className="w-full px-4 py-3 rounded-xl border border-paper-border dark:border-obsidian-800 bg-white dark:bg-obsidian-950 text-paper-ink dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all shadow-paper cursor-pointer disabled:opacity-50"
              >
                {districts.map((dst) => (
                  <option key={dst} value={dst}>
                    {dst}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* District Livability Overview & Batch Action Bar */}
        {selectedDistrict && (
          <div className="p-5 sm:p-6 rounded-2xl bg-obsidian-950 text-white border border-obsidian-800 shadow-obsidian-card">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-semibold">
                    BENCHMARK SPEC • {selectedDistrict.toUpperCase()} DISTRICT
                  </span>
                </div>
                
                {districtSummary?.has_data ? (
                  <div className="flex flex-wrap items-center gap-3 text-xs text-obsidian-muted font-mono">
                    <span>
                      Scored:{' '}
                      <strong className="text-white font-bold">
                        {cities.filter((c) => c.is_scored).length} / {cities.length}
                      </strong>
                    </span>
                    <span className="text-obsidian-800">•</span>
                    <span>
                      Mean Quality:{' '}
                      <strong className="text-emerald-400 font-bold">
                        {districtSummary.average_quality_score}
                      </strong>
                      <span className="text-[10px] text-obsidian-muted"> / 100</span>
                    </span>
                    <span className="text-obsidian-800">•</span>
                    <span className="flex items-center space-x-1 text-obsidian-ink">
                      <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                      <span>{districtSummary.total_healthcare_facilities} Clinics</span>
                    </span>
                    <span className="text-obsidian-800">•</span>
                    <span className="flex items-center space-x-1 text-obsidian-ink">
                      <TreePine className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{districtSummary.total_green_spaces} Parks</span>
                    </span>
                    <span className="text-obsidian-800">•</span>
                    <span className="flex items-center space-x-1 text-obsidian-ink">
                      <Bus className="w-3.5 h-3.5 text-sky-400" />
                      <span>{districtSummary.total_transit_stations} Transit</span>
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3 text-xs text-obsidian-muted">
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>AWAITING EVALUATION (आंकलन लंबित)</span>
                    </span>
                    <span className="text-obsidian-muted text-xs">
                      No settlements pre-cached for {selectedDistrict}. Trigger live OpenStreetMap spatial ingestion below.
                    </span>
                  </div>
                )}
              </div>

              {/* 1-Click Score All Button or Live Progress */}
              <div className="shrink-0">
                {batchScoring ? (
                  <div className="px-4 py-2.5 rounded-xl bg-obsidian-900 border border-emerald-500/40 space-y-2 min-w-[240px]">
                    <div className="flex items-center justify-between text-xs text-emerald-400 font-mono">
                      <span className="flex items-center space-x-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span className="truncate max-w-[140px]">{batchProgress.cityName}...</span>
                      </span>
                      <span>
                        {batchProgress.current} / {batchProgress.total}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-obsidian-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{
                          width: `${(batchProgress.current / Math.max(batchProgress.total, 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : cities.filter((c) => !c.is_scored).length > 0 ? (
                  <button
                    onClick={handleScoreAllCities}
                    disabled={loadingCities || scoringCityName !== null}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs flex items-center space-x-2 transition-all shadow-md shadow-emerald-950 group font-sans cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-200 group-hover:rotate-12 transition-transform" />
                    <span>
                      Batch Evaluate All {cities.filter((c) => !c.is_scored).length} Localities (Live OSM)
                    </span>
                  </button>
                ) : (
                  <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-mono border border-emerald-500/40">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>ALL JURISDICTIONS EVALUATED</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Listed Cities / Towns / Localities */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-paper-border dark:border-obsidian-800 pb-3">
            <div>
              <h3 className="text-base font-serif text-paper-ink dark:text-obsidian-ink flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Localities & Towns in <span className="italic">{selectedDistrict}, {selectedState}</span></span>
              </h3>
              <p className="text-xs text-paper-muted dark:text-obsidian-muted font-sans">
                Each entry represents a verified revenue boundary with strict geo-containment.
              </p>
            </div>

            <div className="flex items-center space-x-2.5 self-start sm:self-auto">
              {cities.length > 5 && (
                <div className="relative w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-paper-muted dark:text-obsidian-muted" />
                  <input
                    type="text"
                    placeholder={`Filter in ${selectedDistrict}...`}
                    value={cityFilterQuery}
                    onChange={(e) => setCityFilterQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-paper-border dark:border-obsidian-800 bg-white dark:bg-obsidian-950 text-paper-ink dark:text-white placeholder-paper-muted dark:placeholder-obsidian-muted focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                  />
                </div>
              )}
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-paper-200/60 dark:bg-obsidian-800 text-paper-ink dark:text-obsidian-muted shrink-0 border border-paper-border dark:border-obsidian-700">
                {cities.filter((c) => !cityFilterQuery || c.name.toLowerCase().includes(cityFilterQuery.toLowerCase())).length} Places
              </span>
            </div>
          </div>

          {loadingCities ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-28 rounded-2xl bg-paper-200/50 dark:bg-obsidian-800/40 animate-pulse border border-paper-border dark:border-obsidian-800" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cities
                .filter((c) => !cityFilterQuery || c.name.toLowerCase().includes(cityFilterQuery.toLowerCase()))
                .map((city) => {
                  const isCurrentScoring = scoringCityName === city.name;

                  return (
                    <div
                      key={city.name}
                      className={`p-4 rounded-2xl border transition-all ${
                        city.is_scored
                          ? 'bg-white dark:bg-obsidian-950 border-paper-border dark:border-obsidian-800 hover:border-emerald-500/50 shadow-paper hover:shadow-paper-hover'
                          : 'bg-paper-100/60 dark:bg-obsidian-900/40 border border-dashed border-paper-border dark:border-obsidian-800 hover:border-amber-500/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="font-sans font-bold text-sm text-paper-ink dark:text-obsidian-ink flex items-center space-x-1.5">
                            <span>{city.name}</span>
                            {city.is_scored && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                          </h4>
                          <span className="text-[11px] font-mono text-paper-muted dark:text-obsidian-muted">
                            {city.district} District
                          </span>
                        </div>

                        {city.is_scored ? (
                          <div className="text-right shrink-0">
                            <span className="inline-block px-2.5 py-0.5 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-xs border border-emerald-500/30">
                              {city.quality_score?.toFixed(1)}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-500/10 dark:bg-amber-500/15 text-[10px] font-mono text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            <span>AWAITING SPEC</span>
                          </span>
                        )}
                      </div>

                      {city.is_scored ? (
                        <div className="space-y-2.5 mt-3 pt-2.5 border-t border-paper-border dark:border-obsidian-800">
                          <div className="flex items-center justify-between text-[11px] font-mono text-paper-muted dark:text-obsidian-muted">
                            <span className="truncate max-w-[120px]">{city.cluster_label || 'Civic Center'}</span>
                            <span className="space-x-1.5">
                              <span>H:{city.counts?.healthcare || 0}</span>
                              <span>P:{city.counts?.green_space || 0}</span>
                              <span>T:{city.counts?.transit || 0}</span>
                            </span>
                          </div>
                          <button
                            onClick={() => onSelectLocality(city.locality_id)}
                            className="w-full py-2 px-3 rounded-xl bg-obsidian-950 hover:bg-emerald-600 dark:bg-obsidian-800 dark:hover:bg-emerald-600 text-white font-medium text-xs transition-all flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
                          >
                            <span>Inspect Spec</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2 mt-3 pt-2.5 border-t border-paper-border dark:border-obsidian-800">
                          <div className="flex items-center justify-between text-[11px] font-mono text-paper-muted dark:text-obsidian-muted">
                            <span>Status:</span>
                            <span>Pending Ingestion</span>
                          </div>
                          <p className="text-[10px] text-paper-muted dark:text-obsidian-muted leading-tight font-sans">
                            Direct OpenStreetMap bounding query ready. Click below to execute live spatial ingestion.
                          </p>
                          <button
                            onClick={() => handleScoreLive(city.name)}
                            disabled={isCurrentScoring || scoringCityName !== null || batchScoring}
                            className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs transition-all flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
                          >
                            {isCurrentScoring ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Evaluating via OSM...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                                <span>Evaluate Live (OSM)</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {/* Custom Locality / Village Write-In Box */}
          <div className="mt-6 p-5 rounded-2xl bg-paper-100 dark:bg-obsidian-950 border border-paper-border dark:border-obsidian-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-paper-ink dark:text-obsidian-ink flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>UNINDEXED VILLAGE OR COLONY IN {selectedDistrict}?</span>
              </span>
              <p className="text-xs text-paper-muted dark:text-obsidian-muted font-sans">
                Type any village, ward, or enclave name in {selectedDistrict}. We will resolve coordinates and score genuine OSM infrastructure live.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (customCityName.trim()) {
                  handleScoreLive(customCityName.trim());
                }
              }}
              className="flex items-center space-x-2 shrink-0"
            >
              <input
                type="text"
                placeholder={`Enter place in ${selectedDistrict}...`}
                value={customCityName}
                onChange={(e) => setCustomCityName(e.target.value)}
                disabled={scoringCityName !== null}
                className="px-4 py-2 text-xs rounded-xl border border-paper-border dark:border-obsidian-800 bg-white dark:bg-obsidian-900 text-paper-ink dark:text-white placeholder-paper-muted dark:placeholder-obsidian-muted focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-60 font-sans"
              />
              <button
                type="submit"
                disabled={!customCityName.trim() || scoringCityName !== null}
                className="px-4 py-2 rounded-xl bg-obsidian-950 hover:bg-emerald-600 dark:bg-white dark:text-obsidian-950 dark:hover:bg-emerald-400 disabled:opacity-50 text-white font-medium text-xs shrink-0 transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                {scoringCityName === customCityName.trim() ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Query</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
