import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, GitCompare, MapPin, Share2, Sparkles, Building2, Trees, Bus, HeartPulse, GraduationCap, Store, Shield, CheckCircle } from 'lucide-react';
import ScoreGauge from '../components/ScoreGauge';
import RadarChart from '../components/RadarChart';
import ClusterBadge from '../components/ClusterBadge';
import { getLocalityById } from '../api/client';

import { jsPDF } from 'jspdf';

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
    pincode,
    district,
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
    is_sparse,
  } = locality;

  // Radar dataset comparing Locality vs City Average
  const radarData = METRIC_DETAILS.map((m) => ({
    metric: m.label.split(' ')[0], // short label
    [name]: scores[m.key] || 0,
    [`${city} Avg`]: city_benchmarks[m.key] || 50,
  }));

  const handleDownloadReport = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Background
      doc.setFillColor(250, 250, 248);
      doc.rect(0, 0, 210, 297, 'F');

      // Accent Line
      doc.setFillColor(16, 185, 129);
      doc.rect(14, 12, 182, 3, 'F');

      // Brand Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(16, 185, 129);
      doc.text('NEIGHBORHOODIQ • URBAN LIVABILITY DOSSIER', 14, 22);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(115, 115, 115);
      doc.text(`REPORT ID: NIQ-${locality.id.toString().padStart(4, '0')} • VERIFIED OPENSTREETMAP DATA`, 14, 26);

      // Divider
      doc.setDrawColor(220, 220, 215);
      doc.setLineWidth(0.3);
      doc.line(14, 29, 196, 29);

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(24, 24, 27);
      doc.text(locality.name, 14, 40);

      // Subtitle
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(82, 82, 91);
      const locSub = [
        locality.district && locality.district.toLowerCase() !== locality.city.toLowerCase()
          ? `${locality.city} (${locality.district}), ${locality.state || 'India'}`
          : `${locality.city}, ${locality.state || 'India'}`,
        locality.pincode ? `PIN: ${locality.pincode}` : null,
      ].filter(Boolean).join(' • ');
      doc.text(locSub, 14, 46);

      // Coordinates
      doc.setFontSize(8);
      doc.setTextColor(115, 115, 115);
      doc.text(`LATITUDE: ${locality.latitude.toFixed(4)}° N, LONGITUDE: ${locality.longitude.toFixed(4)}° E • 1,500m CATCHMENT RADIUS`, 14, 51);

      // Quality Score Box (Left)
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(225, 225, 220);
      doc.roundedRect(14, 56, 88, 38, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(16, 185, 129);
      doc.text('COMPOSITE QUALITY SCORE', 20, 64);

      doc.setFontSize(28);
      doc.setTextColor(24, 24, 27);
      doc.text(`${(locality.quality_score || 0).toFixed(1)}`, 20, 78);

      doc.setFontSize(10);
      doc.setTextColor(115, 115, 115);
      doc.text('/ 100', 60, 77);

      doc.setFontSize(8);
      doc.setTextColor(82, 82, 91);
      doc.text(`Rank #${rank || 'N/A'} of ${total_localities || 30} • ${percentile || 90}th Percentile`, 20, 86);

      // Cluster Archetype Box (Right)
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(225, 225, 220);
      doc.roundedRect(108, 56, 88, 38, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(14, 165, 233);
      doc.text('K-MEANS CLUSTER ARCHETYPE', 114, 64);

      doc.setFontSize(13);
      doc.setTextColor(24, 24, 27);
      doc.text(locality.cluster?.label || 'Balanced Suburb', 114, 73);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 105);
      const descLines = doc.splitTextToSize(locality.cluster?.description || 'Balanced urban community infrastructure with accessible residential conveniences.', 76);
      doc.text(descLines, 114, 80);

      // Section: Dimensional Metrics Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(24, 24, 27);
      doc.text('CIVIC INFRASTRUCTURE SPECIFICATION MATRIX', 14, 105);

      // Table Header
      doc.setFillColor(240, 240, 236);
      doc.rect(14, 109, 182, 8, 'F');

      doc.setFontSize(8);
      doc.setTextColor(82, 82, 91);
      doc.text('DIMENSION', 18, 114.5);
      doc.text('SCORE (0-100)', 85, 114.5);
      doc.text('RAW OSM COUNT', 125, 114.5);
      doc.text('CITY BENCHMARK', 160, 114.5);

      let yPos = 123;
      METRIC_DETAILS.forEach((m, idx) => {
        if (idx % 2 === 1) {
          doc.setFillColor(248, 248, 245);
          doc.rect(14, yPos - 5.5, 182, 9, 'F');
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(24, 24, 27);
        doc.text(m.label, 18, yPos);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const scoreVal = scores[m.key] !== undefined ? scores[m.key].toFixed(1) : '0.0';
        doc.text(scoreVal, 88, yPos);

        const countVal = counts[m.key] !== undefined ? String(counts[m.key]) : '0';
        doc.text(countVal, 130, yPos);

        const benchVal = city_benchmarks[m.key] !== undefined ? `${city_benchmarks[m.key].toFixed(1)} Avg` : '50.0 Avg';
        doc.text(benchVal, 162, yPos);

        yPos += 9.5;
      });

      // Spatial Methodology Box
      yPos += 4;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(225, 225, 220);
      doc.roundedRect(14, yPos, 182, 36, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(16, 185, 129);
      doc.text('DATA VERIFICATION & SPATIAL METHODOLOGY', 20, yPos + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(90, 90, 95);
      const methText = 'All infrastructure counts are fetched directly from OpenStreetMap Overpass QL across a standardized 1,500-meter (1.5 km) walkable catchment bounding box. Public transport nodes are strictly deduplicated by (osm_type, osm_id). Scores are mathematically normalized on a logarithmic saturating scale against national benchmarks without artificial civic presence minimums.';
      doc.text(doc.splitTextToSize(methText, 170), 20, yPos + 13);

      // Footer
      doc.setDrawColor(220, 220, 215);
      doc.line(14, 275, 196, 275);

      doc.setFontSize(7);
      doc.setTextColor(130, 130, 135);
      doc.text(`Generated on ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} • NeighborhoodIQ Open Data Analytics`, 14, 281);
      doc.text('Page 1 of 1 • Official Urban Livability Assessment', 196, 281, { align: 'right' });

      // Trigger automatic browser download
      const cleanFileName = `${locality.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Livability_Report.pdf`;
      doc.save(cleanFileName);
    } catch (err) {
      console.error('Failed to generate PDF dossier:', err);
      window.print();
    }
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
            <span>Download Report (PDF)</span>
          </button>
        </div>
      </div>

      {/* Sparse Data Disclaimer if no mapped OSM entities */}
      {(is_sparse || (counts.transit === 0 && counts.healthcare === 0 && counts.green_space === 0 && counts.education === 0 && counts.amenity === 0)) && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4.5 flex items-start space-x-3 text-amber-900 dark:text-amber-200 text-xs font-mono">
          <Sparkles className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="space-y-0.5 font-sans">
            <p className="font-bold font-mono text-[11px] text-amber-700 dark:text-amber-300 uppercase tracking-wider">
              Sparse OpenStreetMap Mapping
            </p>
            <p className="text-xs text-amber-800/90 dark:text-amber-200/90 leading-relaxed">
              This locality or rural area currently has minimal mapped civic infrastructure nodes in OpenStreetMap. Displayed scores reflect genuine raw counts without artificial floors or synthetic inflation.
            </p>
          </div>
        </div>
      )}

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
