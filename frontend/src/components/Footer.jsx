import React from 'react';
import { ExternalLink, ShieldAlert, Cpu, Database, Compass } from 'lucide-react';
import LogoMark from './LogoMark';

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-paper-border/80 dark:border-obsidian-800/80 bg-paper-100/50 dark:bg-obsidian-900/50 transition-colors py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
          {/* About / Colophon */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <LogoMark className="w-8 h-8" />
              <span className="text-base font-extrabold tracking-tight text-paper-ink dark:text-obsidian-ink">
                Neighborhood<span className="text-emerald-600 dark:text-emerald-400 font-black">·IQ</span>
              </span>
            </div>
            <p className="text-xs text-paper-muted dark:text-obsidian-muted leading-relaxed">
              A national spatial intelligence project providing transparent, mathematically normalized livability indexes for residential areas across India. Built on 100% genuine OpenStreetMap geographic infrastructure.
            </p>
            <div className="text-[10px] font-mono-meta text-paper-muted dark:text-obsidian-muted uppercase tracking-wider">
              PAN-INDIA SPATIAL INDEX / 2026 EDITION
            </div>
          </div>

          {/* Methodology & Spatial Catchment */}
          <div>
            <h4 className="text-[11px] font-mono-meta font-bold uppercase tracking-wider text-paper-ink dark:text-obsidian-ink mb-3.5 flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Spatial Methodology</span>
            </h4>
            <ul className="text-xs space-y-2 text-paper-muted dark:text-obsidian-muted leading-relaxed">
              <li>• <strong className="text-paper-ink dark:text-obsidian-ink">2.2 km Catchment:</strong> 5–7 min local mobility radius capturing district hospitals, parks, and transit.</li>
              <li>• <strong className="text-paper-ink dark:text-obsidian-ink">Element Deduplication:</strong> OSM nodes & ways deduplicated by internal OSM ID to prevent inflation.</li>
              <li>• <strong className="text-paper-ink dark:text-obsidian-ink">Logarithmic Normalization:</strong> Diminishing returns scaling ensuring equitable scores across tier 1–3 cities.</li>
              <li>• <strong className="text-paper-ink dark:text-obsidian-ink">Unsupervised Clustering:</strong> 4-archetype KMeans segmentation with 2D PCA projection.</li>
            </ul>
          </div>

          {/* Data Sources & Transparency */}
          <div>
            <h4 className="text-[11px] font-mono-meta font-bold uppercase tracking-wider text-paper-ink dark:text-obsidian-ink mb-3.5 flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Attribution & Integrity</span>
            </h4>
            <p className="text-xs text-paper-muted dark:text-obsidian-muted leading-relaxed mb-3">
              Spatial infrastructure extracted live from <a href="https://www.openstreetmap.org" target="_blank" rel="noreferrer" className="text-emerald-700 dark:text-emerald-400 font-medium hover:underline inline-flex items-center">OpenStreetMap <ExternalLink className="w-2.5 h-2.5 ml-0.5" /></a> via Overpass API & Nominatim.
            </p>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-300 leading-normal">
              <strong>Integrity Commitment:</strong> Zero synthetic figures. Unanalyzed towns are transparently presented as "Pending Evaluation" with 1-click live querying.
            </div>
          </div>
        </div>

        <div className="border-t border-paper-border/80 dark:border-obsidian-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono-meta text-paper-muted dark:text-obsidian-muted">
          <p>© {new Date().getFullYear()} NeighborhoodIQ — Urban Livability Archive. Open data for equitable cities.</p>
          <div className="flex items-center space-x-3 mt-2 sm:mt-0">
            <span>FastAPI Backend</span>
            <span>•</span>
            <span>React + Vite</span>
            <span>•</span>
            <span>OpenStreetMap Overpass</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
