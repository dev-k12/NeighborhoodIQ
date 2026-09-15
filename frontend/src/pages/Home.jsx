import React, { useState, useEffect } from 'react';
import { Search, MapPin, Sparkles, TrendingUp, Filter, AlertCircle, Loader2, Compass, Layers, CheckSquare, ArrowRight } from 'lucide-react';
import LocalityCard from '../components/LocalityCard';
import GeoSearchEngine from '../components/GeoSearchEngine';
import HeroGlobeAnimation from '../components/HeroGlobeAnimation';
import { getLocalities, lookupLocality, getLeaderboard, getDistinctCities } from '../api/client';

export default function Home({ onSelectLocality, onCompareLocalities, comparedIds, setComparedIds, isDark }) {
  const [localities, setLocalities] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState('All India');
  const [availableCities, setAvailableCities] = useState(['All India']);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Worldwide live lookup states
  const [worldwideQuery, setWorldwideQuery] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lookupSuccess, setLookupSuccess] = useState(null);

  // Sorting
  const [sortBy, setSortBy] = useState('quality_score');

  // Load distinct cities for filter tabs
  const loadCitiesList = async () => {
    try {
      const res = await getDistinctCities();
      if (res.cities && res.cities.length > 0) {
        setAvailableCities(['All India', ...res.cities.map((c) => c.city)]);
      }
    } catch (err) {
      console.error('Failed to load distinct cities:', err);
    }
  };

  // Initial load: all localities & default leaderboard
  useEffect(() => {
    async function initData() {
      try {
        setLoading(true);
        const [locRes, leadRes] = await Promise.all([
          getLocalities({ sort_by: 'quality_score', order: 'desc' }),
          getLeaderboard(5),
        ]);
        setLocalities(locRes.localities || []);
        setLeaderboard(leadRes.leaderboard || []);
        await loadCitiesList();
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, []);

  // Filtered localities based on tab and search
  useEffect(() => {
    async function filterLocalities() {
      try {
        setLoading(true);
        const params = {
          sort_by: sortBy,
          order: 'desc',
        };
        if (selectedCity !== 'All India') {
          params.city = selectedCity;
        }
        if (searchQuery.trim()) {
          params.search = searchQuery.trim();
        }
        const res = await getLocalities(params);
        setLocalities(res.localities || []);
      } catch (err) {
        console.error('Error filtering localities:', err);
      } finally {
        setLoading(false);
      }
    }
    filterLocalities();
  }, [selectedCity, searchQuery, sortBy]);

  // Live lookup handler for unseeded or worldwide localities
  const handleWorldwideLookup = async (e, customQuery = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const queryToUse = (customQuery || worldwideQuery).trim();
    if (!queryToUse || queryToUse.length < 2) return;

    setLookupLoading(true);
    setLookupError('');
    setLookupSuccess(null);

    try {
      const result = await lookupLocality(queryToUse);
      setLookupSuccess(result);
      // Prepend to current localities list or update existing entry
      setLocalities((prev) => {
        const filtered = prev.filter((l) => l.id !== result.id);
        return [result, ...filtered];
      });
      // Refresh leaderboard so it reflects newly scored locality
      const leadRes = await getLeaderboard(5, selectedCity !== 'All India' ? selectedCity : null);
      setLeaderboard(leadRes.leaderboard || []);
      setWorldwideQuery('');
      setSearchQuery('');
    } catch (err) {
      setLookupError(
        err.response?.data?.detail || 'Could not locate and score this locality on OpenStreetMap. Please check spelling.'
      );
    } finally {
      setLookupLoading(false);
    }
  };

  const toggleCompare = (id) => {
    setComparedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 3) {
        alert('You can compare up to 3 localities at a time.');
        return prev;
      }
      return [...prev, id];
    });
  };

  const SUGGESTED_PLACES = [
    '110001',
    '400050',
    '560038',
    'Connaught Place, Delhi',
    'Bandra West, Mumbai',
    'Indiranagar, Bangalore',
    'Hazratganj, Lucknow',
    'C-Scheme, Jaipur',
    'Sector 17, Chandigarh',
    'Salt Lake, Kolkata',
    'Anna Nagar, Chennai'
  ];

  return (
    <div className="space-y-12 pb-20">
      {/* Editorial Architectural Hero Header with Interactive Globe & Spatial Web Showcase */}
      <div className="relative rounded-3xl bg-white dark:bg-obsidian-900 text-paper-ink dark:text-obsidian-ink p-7 sm:p-10 lg:p-12 overflow-hidden border border-paper-border dark:border-obsidian-800 shadow-paper bg-blueprint-grid">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center relative z-10">
          {/* Left Column: Headline, Editorial Context & Ticker (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-paper-100 dark:bg-obsidian-850 border border-paper-border dark:border-obsidian-800 text-[10px] font-mono-meta font-bold uppercase tracking-widest text-paper-muted dark:text-obsidian-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>OpenStreetMap Spatial Intelligence • Pan-India Index</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.12] text-paper-ink dark:text-obsidian-ink">
              Know how livable any neighborhood <span className="font-serif-italic font-normal text-emerald-600 dark:text-emerald-400">across India</span> actually is.
            </h1>

            <p className="text-paper-muted dark:text-obsidian-muted text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
              From tier-1 metropolitan nodes to district headquarters and agrarian tehsils (e.g. <em>Bulandshahr</em>, <em>Lucknow</em>, <em>Jaipur</em>, <em>Kochi</em>). NeighborhoodIQ measures verified physical infrastructure — hospitals, schools, parks, transit nodes, and daily retail amenities.
            </p>

            {/* Architectural Ticker */}
            <div className="pt-4 grid grid-cols-3 gap-6 border-t border-paper-border dark:border-obsidian-800/80 max-w-lg">
              <div>
                <span className="block text-xl sm:text-2xl font-black text-paper-ink dark:text-white font-mono">36 / 36</span>
                <span className="text-[11px] font-mono-meta text-paper-muted dark:text-obsidian-muted uppercase">States & UTs</span>
              </div>
              <div>
                <span className="block text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">458</span>
                <span className="text-[11px] font-mono-meta text-paper-muted dark:text-obsidian-muted uppercase">Districts</span>
              </div>
              <div>
                <span className="block text-xl sm:text-2xl font-black text-paper-ink dark:text-white font-mono">2,600+</span>
                <span className="text-[11px] font-mono-meta text-paper-muted dark:text-obsidian-muted uppercase">Cities & Towns</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Hero Globe & Spatial Web Showcase (5 Cols) */}
          <div className="lg:col-span-5 w-full">
            <HeroGlobeAnimation
              isDark={isDark}
              onSelectLocality={(placeName) => {
                handleWorldwideLookup(null, placeName);
              }}
            />
          </div>
        </div>
      </div>

      {/* 3-Tier Cascading Regional Explorer: State -> District -> City/Town */}
      <GeoSearchEngine
        onSelectLocality={onSelectLocality}
        onLocalityAdded={(newLoc) => {
          setLocalities((prev) => {
            const filtered = prev.filter((l) => l.id !== newLoc.id);
            return [newLoc, ...filtered];
          });
          getLeaderboard(5, selectedCity !== 'All India' ? selectedCity : null)
            .then((leadRes) => setLeaderboard(leadRes.leaderboard || []))
            .catch(() => {});
        }}
      />

      {/* Live Worldwide Lookup Box / Terminal */}
      <div className="bg-white dark:bg-obsidian-900 rounded-2xl p-6 sm:p-7 border border-paper-border dark:border-obsidian-800 shadow-paper">
        <div className="max-w-3xl">
          <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 font-mono-meta text-[11px] font-bold uppercase tracking-wider mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Ad-Hoc Spatial Lookup Terminal</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-paper-ink dark:text-white">
            Score any specific neighborhood, ward, or 6-digit PIN code live
          </h2>
          <p className="text-xs text-paper-muted dark:text-obsidian-muted mb-4 leading-relaxed">
            Enter any 6-digit Indian PIN code (e.g. <em>110001</em>, <em>400050</em>, <em>560038</em>) or locality name across India. Our backend resolves coordinates, queries OpenStreetMap Overpass within a 1,500m (1.5 km) catchment, deduplicates transit stations, and computes verified livability metrics live.
          </p>

          <form onSubmit={handleWorldwideLookup} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-paper-muted dark:text-obsidian-muted" />
              <input
                type="text"
                placeholder="Enter place name or 6-digit Indian PIN code (e.g. 110001, 560038, Indiranagar)..."
                value={worldwideQuery}
                onChange={(e) => setWorldwideQuery(e.target.value)}
                disabled={lookupLoading}
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-paper-border dark:border-obsidian-800 bg-paper-50 dark:bg-obsidian-950 text-paper-ink dark:text-white placeholder-paper-muted dark:placeholder-obsidian-muted focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-xs"
              />
            </div>
            <button
              type="submit"
              disabled={lookupLoading || !worldwideQuery.trim()}
              className="px-5 py-2.5 rounded-xl bg-paper-ink hover:bg-emerald-700 dark:bg-white dark:hover:bg-emerald-400 text-white dark:text-obsidian-950 font-bold text-xs transition-all flex items-center justify-center space-x-2 shadow-xs shrink-0"
            >
              {lookupLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Querying OSM (1-2s)...</span>
                </>
              ) : (
                <>
                  <span>Evaluate Live</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick suggestion chips */}
          <div className="mt-3.5 flex flex-wrap items-center gap-1.5 text-xs text-paper-muted dark:text-obsidian-muted">
            <span className="font-mono-meta text-[10px] uppercase font-bold text-paper-muted dark:text-obsidian-muted mr-1">Sample Places:</span>
            {SUGGESTED_PLACES.map((place) => (
              <button
                key={place}
                type="button"
                onClick={() => {
                  setWorldwideQuery(place);
                  handleWorldwideLookup(null, place);
                }}
                disabled={lookupLoading}
                className="px-2.5 py-1 rounded-lg bg-paper-100 dark:bg-obsidian-850 hover:bg-paper-200 dark:hover:bg-obsidian-800 text-paper-ink dark:text-obsidian-ink border border-paper-border dark:border-obsidian-800 transition-all text-[11px] font-medium"
              >
                {place}
              </button>
            ))}
          </div>

          {/* Feedback banners */}
          {lookupError && (
            <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-400 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{lookupError}</span>
            </div>
          )}

          {lookupSuccess && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  Scored <strong>{lookupSuccess.name}, {lookupSuccess.city}</strong>: Quality Score <strong>{lookupSuccess.quality_score}</strong> ({lookupSuccess.counts?.transit || 0} transit, {lookupSuccess.counts?.healthcare || 0} healthcare, {lookupSuccess.counts?.amenity || 0} amenities)!
                </span>
              </div>
              <button
                onClick={() => onSelectLocality(lookupSuccess.id)}
                className="font-bold underline ml-2 hover:text-emerald-600 shrink-0"
              >
                Inspect Report →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Layout: Localities Grid + Leaderboard Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left 3 Columns: Filters + Localities Grid */}
        <div className="lg:col-span-3 space-y-6">
          {/* City Filter Pills & Sorting */}
          {/* City Filter Pills & Sorting */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* City Tabs */}
            <div className="flex flex-wrap gap-1.5 p-1.5 rounded-2xl bg-paper-100 dark:bg-obsidian-900 border border-paper-border dark:border-obsidian-800 max-h-32 overflow-y-auto">
              {availableCities.map((city) => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                    selectedCity === city
                      ? 'bg-white dark:bg-obsidian-850 text-paper-ink dark:text-white shadow-xs border border-paper-border/60 dark:border-obsidian-700'
                      : 'text-paper-muted dark:text-obsidian-muted hover:text-paper-ink dark:hover:text-white hover:bg-paper-200/50 dark:hover:bg-obsidian-800/50'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>

            {/* In-list filter & Sort dropdown */}
            <div className="flex items-center space-x-2.5 w-full sm:w-auto shrink-0">
              <div className="relative flex-1 sm:w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-paper-muted dark:text-obsidian-muted" />
                <input
                  type="text"
                  placeholder="Search localities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-paper-border dark:border-obsidian-800 bg-white dark:bg-obsidian-900 text-paper-ink dark:text-white placeholder-paper-muted dark:placeholder-obsidian-muted focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs"
                />
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-paper-border dark:border-obsidian-800 bg-white dark:bg-obsidian-900 text-paper-ink dark:text-white focus:outline-none font-medium cursor-pointer shadow-xs"
              >
                <option value="quality_score">Sort: Quality Score</option>
                <option value="transit_count">Sort: Transit Density</option>
                <option value="healthcare_count">Sort: Healthcare</option>
                <option value="green_space_count">Sort: Green Spaces</option>
                <option value="amenity_count">Sort: Amenities</option>
              </select>
            </div>
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-60 rounded-2xl bg-paper-100 dark:bg-obsidian-900 border border-paper-border dark:border-obsidian-800 animate-pulse" />
              ))}
            </div>
          ) : localities.length === 0 ? (
            <div className="p-10 text-center rounded-3xl border border-dashed border-paper-border dark:border-obsidian-800 bg-paper-100/40 dark:bg-obsidian-900/40 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-paper-200 dark:bg-obsidian-800 text-paper-ink dark:text-white flex items-center justify-center mx-auto">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-paper-ink dark:text-white">
                  {searchQuery ? `"${searchQuery}" is not pre-indexed in this view` : 'No localities found'}
                </h4>
                <p className="text-xs text-paper-muted dark:text-obsidian-muted max-w-md mx-auto">
                  {searchQuery
                    ? `NeighborhoodIQ can evaluate genuine civic infrastructure scores for "${searchQuery}" live directly from OpenStreetMap.`
                    : 'Try selecting "All India" or clearing your search filter.'}
                </p>
              </div>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    handleWorldwideLookup(null, searchQuery);
                  }}
                  disabled={lookupLoading}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-paper-ink hover:bg-emerald-700 dark:bg-white dark:hover:bg-emerald-400 disabled:opacity-50 text-white dark:text-obsidian-950 font-bold text-xs shadow-sm transition-all"
                >
                  {lookupLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Fetching OpenStreetMap (1-2s)...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Evaluate "{searchQuery}" Live Now</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {localities.map((loc) => (
                <LocalityCard
                  key={loc.id}
                  locality={loc}
                  onSelect={onSelectLocality}
                  isCompared={comparedIds.includes(loc.id)}
                  onToggleCompare={toggleCompare}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Column: Leaderboard Widget & Quick Insights */}
        <div className="space-y-6">
          {/* Top Leaderboard Card */}
          <div className="bg-white dark:bg-obsidian-900 rounded-2xl border border-paper-border dark:border-obsidian-800 p-5 shadow-paper">
            <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-paper-border/80 dark:border-obsidian-800">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-mono-meta font-bold uppercase tracking-wider text-paper-ink dark:text-white">
                Top Civic Index
              </h3>
            </div>

            <div className="space-y-2.5">
              {leaderboard.map((item, idx) => (
                <div
                  key={item.id}
                  onClick={() => onSelectLocality(item.id)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-paper-100 dark:hover:bg-obsidian-850 cursor-pointer transition-all border border-transparent hover:border-paper-border dark:hover:border-obsidian-800 group"
                >
                  <div className="flex items-center space-x-3">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                        idx === 0
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          : idx === 1
                          ? 'bg-paper-200 text-paper-ink dark:bg-obsidian-800 dark:text-obsidian-ink'
                          : idx === 2
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300'
                          : 'text-paper-muted dark:text-obsidian-muted'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-paper-ink dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {item.name}
                      </h4>
                      <span className="text-[10px] text-paper-muted dark:text-obsidian-muted">{item.city}</span>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/80 dark:border-emerald-800/60">
                    {item.quality_score.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => onCompareLocalities(leaderboard.slice(0, 3).map((l) => l.id))}
              className="w-full mt-4 py-2 rounded-xl bg-paper-100 dark:bg-obsidian-850 hover:bg-paper-200 dark:hover:bg-obsidian-800 text-paper-ink dark:text-white border border-paper-border dark:border-obsidian-800 text-xs font-semibold transition-all text-center"
            >
              Compare Top 3 Localities →
            </button>
          </div>

          {/* Quick Methodology Note */}
          <div className="bg-paper-100/60 dark:bg-obsidian-900/60 rounded-2xl border border-paper-border dark:border-obsidian-800 p-5 text-xs text-paper-muted dark:text-obsidian-muted space-y-2.5">
            <div className="flex items-center space-x-2 font-mono-meta font-bold text-[11px] uppercase tracking-wider text-paper-ink dark:text-obsidian-ink">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Scoring Methodology</span>
            </div>
            <p className="text-[11px] leading-relaxed text-paper-muted dark:text-obsidian-muted">
              Spatial nodes within 2.2 km are normalized using diminishing-returns logarithmic modeling to a 0–100 index, then composited into a Quality Score. Cluster archetypes are segmented via 4-archetype KMeans.
            </p>
          </div>
        </div>
      </div>

      {/* Floating Compare Action Bar */}
      {comparedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-paper-ink dark:bg-white text-white dark:text-obsidian-950 px-6 py-3 rounded-2xl shadow-paper-hover border border-paper-muted/30 dark:border-obsidian-300 flex items-center space-x-4">
          <span className="text-xs font-mono font-medium">
            <strong>{comparedIds.length}</strong> / 3 selected
          </span>
          <button
            disabled={comparedIds.length < 2}
            onClick={() => onCompareLocalities(comparedIds)}
            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs"
          >
            Compare Now
          </button>
          <button
            onClick={() => setComparedIds([])}
            className="text-xs text-paper-muted hover:text-white dark:text-obsidian-muted dark:hover:text-obsidian-950 transition-colors"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
