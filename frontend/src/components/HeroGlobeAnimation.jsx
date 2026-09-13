import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Compass, MapPin, Sparkles, Activity, Globe, Eye, ChevronRight } from 'lucide-react';

/**
 * Regional Hub Nodes across India for the Spatial Web
 */
const REGIONAL_NODES = [
  { id: 'delhi', name: 'Delhi NCR', state: 'National Capital', x: 215, y: 155, score: 84.5, type: 'hub', label: 'Central Civic Core' },
  { id: 'srinagar', name: 'Srinagar', state: 'Jammu & Kashmir', x: 185, y: 80, score: 69.4, type: 'node', label: 'Valley Eco Corridor' },
  { id: 'jaipur', name: 'Jaipur', state: 'Rajasthan', x: 175, y: 180, score: 77.8, type: 'node', label: 'Heritage & Urban Grid' },
  { id: 'lucknow', name: 'Lucknow', state: 'Uttar Pradesh', x: 275, y: 180, score: 78.4, type: 'node', label: 'Administrative & Medical' },
  { id: 'bulandshahr', name: 'Bulandshahr', state: 'Uttar Pradesh', x: 235, y: 168, score: 66.6, type: 'node', label: 'Verified District Spec' },
  { id: 'kolkata', name: 'Kolkata', state: 'West Bengal', x: 345, y: 220, score: 80.1, type: 'node', label: 'Eastern Riverine Hub' },
  { id: 'guwahati', name: 'Guwahati', state: 'Assam', x: 395, y: 165, score: 72.5, type: 'node', label: 'North-East Gateway' },
  { id: 'ahmedabad', name: 'Ahmedabad', state: 'Gujarat', x: 140, y: 230, score: 81.4, type: 'node', label: 'Western Commercial Axis' },
  { id: 'bhopal', name: 'Bhopal', state: 'Madhya Pradesh', x: 230, y: 235, score: 74.2, type: 'node', label: 'Central Lake & Green' },
  { id: 'mumbai', name: 'Mumbai', state: 'Maharashtra', x: 150, y: 290, score: 86.9, type: 'node', label: 'Coastal Transit Giant' },
  { id: 'hyderabad', name: 'Hyderabad', state: 'Telangana', x: 225, y: 285, score: 83.7, type: 'node', label: 'Deccan Innovation Hub' },
  { id: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', x: 210, y: 345, score: 88.5, type: 'node', label: 'High Livability Capital' },
  { id: 'chennai', name: 'Chennai', state: 'Tamil Nadu', x: 250, y: 350, score: 82.9, type: 'node', label: 'Coromandel Transit Port' },
  { id: 'kochi', name: 'Kochi', state: 'Kerala', x: 195, y: 390, score: 85.3, type: 'node', label: 'Coastal Canal Network' },
];

/**
 * Web connection lines from central hub (Delhi NCR) to all regional nodes,
 * plus inter-regional cross links (e.g. Mumbai-Bengaluru, Kolkata-Guwahati)
 */
const WEB_CONNECTIONS = [
  // Star connections from central hub
  { from: 'delhi', to: 'srinagar' },
  { from: 'delhi', to: 'jaipur' },
  { from: 'delhi', to: 'bulandshahr' },
  { from: 'delhi', to: 'lucknow' },
  { from: 'delhi', to: 'bhopal' },
  { from: 'delhi', to: 'ahmedabad' },
  { from: 'delhi', to: 'kolkata' },
  { from: 'delhi', to: 'hyderabad' },
  // Inter-regional perimeter lattice mesh
  { from: 'lucknow', to: 'kolkata' },
  { from: 'kolkata', to: 'guwahati' },
  { from: 'ahmedabad', to: 'mumbai' },
  { from: 'bhopal', to: 'hyderabad' },
  { from: 'mumbai', to: 'hyderabad' },
  { from: 'mumbai', to: 'bengaluru' },
  { from: 'hyderabad', to: 'chennai' },
  { from: 'hyderabad', to: 'bengaluru' },
  { from: 'bengaluru', to: 'chennai' },
  { from: 'bengaluru', to: 'kochi' },
  { from: 'chennai', to: 'kochi' },
];

const PHASES = [
  { id: 0, title: 'Orbital Scan', sub: 'Rotating Global Coordinate Grid' },
  { id: 1, title: 'Target Lock & Tap', sub: 'Coordinates 20.59° N, 78.96° E' },
  { id: 2, title: 'Zoom to India', sub: 'Territorial Boundary Expansion' },
  { id: 3, title: 'Spatial Web Radiation', sub: 'Center Beam Pulse Deployed' },
  { id: 4, title: 'Pan-India Active Mesh', sub: 'All 36 States & UTs Interlinked' },
];

export default function HeroGlobeAnimation({ isDark = false, onSelectLocality }) {
  // Phase sequence: 0 (Globe) -> 1 (Lock/Tap) -> 2 (Zoom) -> 3 (Web burst) -> 4 (Active Mesh)
  const [phase, setPhase] = useState(0);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [autoPlay, setAutoPlay] = useState(true);
  const timerRef = useRef(null);

  // Automatic phase sequence controller
  useEffect(() => {
    if (!autoPlay) return;

    const timings = [3200, 2200, 2400, 2400, 7000]; // Duration per phase (ms)
    timerRef.current = setTimeout(() => {
      setPhase((prev) => (prev + 1) % PHASES.length);
    }, timings[phase]);

    return () => clearTimeout(timerRef.current);
  }, [phase, autoPlay]);

  const handleRestart = () => {
    clearTimeout(timerRef.current);
    setPhase(0);
    setAutoPlay(true);
  };

  const handleJumpToPhase = (p) => {
    clearTimeout(timerRef.current);
    setPhase(p);
    setAutoPlay(false);
  };

  // Node position lookup helper
  const getNodePos = (id) => REGIONAL_NODES.find((n) => n.id === id) || { x: 215, y: 155 };

  return (
    <div className="relative rounded-3xl bg-paper-100/90 dark:bg-obsidian-950/90 border border-paper-border dark:border-obsidian-800 shadow-paper overflow-hidden transition-all duration-500 backdrop-blur-md">
      {/* Top Telemetry Header Bar */}
      <div className="px-5 py-3 border-b border-paper-border dark:border-obsidian-800 bg-paper-50/60 dark:bg-obsidian-900/60 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-bold text-paper-ink dark:text-obsidian-ink tracking-tight">
            OSM SPATIAL RADAR
          </span>
          <span className="text-[10px] text-paper-muted dark:text-obsidian-muted hidden sm:inline">
            [20.5937° N, 78.9629° E]
          </span>
        </div>

        {/* Phase Pill Indicator / Replay Button */}
        <div className="flex items-center space-x-2">
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 font-semibold">
            {PHASES[phase].title}
          </span>
          <button
            onClick={handleRestart}
            className="p-1 rounded-md text-paper-muted dark:text-obsidian-muted hover:text-paper-ink dark:hover:text-white hover:bg-paper-200 dark:hover:bg-obsidian-800 transition-colors cursor-pointer"
            title="Replay sequence"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Stage SVG Canvas */}
      <div className="relative h-[340px] sm:h-[400px] w-full flex items-center justify-center overflow-hidden bg-blueprint-grid">
        <svg
          viewBox="0 0 460 440"
          className="w-full h-full select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Emerald Laser Gradient */}
            <linearGradient id="laserBeamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.4" />
            </linearGradient>

            {/* Radial Web Core Glow */}
            <radialGradient id="hubCenterGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#10B981" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </radialGradient>

            {/* Globe Atmospheric Halo */}
            <radialGradient id="globeHalo" cx="50%" cy="50%" r="50%">
              <stop offset="65%" stopColor="#10B981" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.25" />
            </radialGradient>
          </defs>

          {/* ================================================================= */}
          {/* SCENE 1: ORBITAL ROTATING GLOBE (Phases 0 & 1)                     */}
          {/* ================================================================= */}
          {(phase === 0 || phase === 1) && (
            <g
              className="transition-all duration-700 ease-out"
              style={{
                transformOrigin: '230px 220px',
                transform: phase === 1 ? 'scale(1.08)' : 'scale(1)',
              }}
            >
              {/* Outer Orbital Coordinate Rings */}
              <circle
                cx="230"
                cy="220"
                r="150"
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="4 6"
                className="text-paper-border dark:text-obsidian-800 opacity-60 animate-orbit-slow"
              />
              <circle
                cx="230"
                cy="220"
                r="135"
                stroke="currentColor"
                strokeWidth="0.8"
                strokeDasharray="2 4"
                className="text-emerald-500/30 dark:text-emerald-400/20"
              />

              {/* Main Globe Sphere Base */}
              <circle
                cx="230"
                cy="220"
                r="115"
                fill="url(#globeHalo)"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-paper-border dark:text-obsidian-800"
              />

              {/* Globe Latitude Lines (Ellipses) */}
              <ellipse cx="230" cy="220" rx="115" ry="32" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" className="text-paper-border dark:text-obsidian-800 opacity-60" />
              <ellipse cx="230" cy="180" rx="98" ry="24" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 3" className="text-paper-border dark:text-obsidian-800 opacity-40" />
              <ellipse cx="230" cy="260" rx="98" ry="24" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 3" className="text-paper-border dark:text-obsidian-800 opacity-40" />

              {/* Globe Longitude Lines (Rotated Great Circles) */}
              <ellipse cx="230" cy="220" rx="35" ry="115" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" className="text-paper-border dark:text-obsidian-800 opacity-60" />
              <ellipse cx="230" cy="220" rx="75" ry="115" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 3" className="text-paper-border dark:text-obsidian-800 opacity-40" />

              {/* Simulated Continental Silhouettes on the rotating globe */}
              <g className={phase === 0 ? 'animate-pulse' : ''}>
                {/* Europe / Eurasia */}
                <path
                  d="M 180 160 Q 200 150 230 155 Q 260 160 280 150 Q 270 175 250 180 Z"
                  fill="currentColor"
                  className="text-paper-muted/30 dark:text-obsidian-muted/20"
                />
                {/* Africa outline */}
                <path
                  d="M 170 190 Q 185 190 195 210 Q 185 240 170 250 Q 160 220 170 190 Z"
                  fill="currentColor"
                  className="text-paper-muted/25 dark:text-obsidian-muted/15"
                />
                {/* Indian Subcontinent silhouette on the globe (highlighted) */}
                <path
                  d="M 225 185
                     L 245 188
                     L 255 198
                     L 250 215
                     L 240 235
                     L 230 240
                     L 222 220
                     L 218 200
                     Z"
                  fill="#10B981"
                  fillOpacity={phase === 1 ? '0.7' : '0.4'}
                  stroke="#10B981"
                  strokeWidth="1.2"
                  className="transition-all duration-500"
                />
              </g>

              {/* TARGET LOCK & "TAP" WAVE (Active in Phase 1) */}
              {phase === 1 && (
                <g className="transition-all duration-300">
                  {/* Expanding Radar Ripple Waves (The "Tap" effect requested by user) */}
                  <circle cx="235" cy="210" r="16" stroke="#10B981" fill="none" className="animate-radar-wave" />
                  <circle cx="235" cy="210" r="28" stroke="#10B981" fill="none" className="animate-radar-wave" style={{ animationDelay: '0.6s' }} />
                  <circle cx="235" cy="210" r="44" stroke="#10B981" fill="none" className="animate-radar-wave" style={{ animationDelay: '1.2s' }} />

                  {/* Precision Target Crosshairs */}
                  <line x1="235" y1="190" x2="235" y2="230" stroke="#10B981" strokeWidth="1.5" strokeDasharray="2 2" />
                  <line x1="215" y1="210" x2="255" y2="210" stroke="#10B981" strokeWidth="1.5" strokeDasharray="2 2" />

                  {/* Tactile Coordinate Lock Point */}
                  <circle cx="235" cy="210" r="4.5" fill="#10B981" className="animate-ping" />
                  <circle cx="235" cy="210" r="3.5" fill="#10B981" />

                  {/* Target Telemetry Label */}
                  <rect x="245" y="195" width="96" height="22" rx="4" fill="rgba(12,13,14,0.85)" stroke="#10B981" strokeWidth="0.8" />
                  <text x="250" y="210" fill="#10B981" fontSize="9" fontFamily="Space Mono" fontWeight="bold">
                    TARGET: INDIA
                  </text>
                </g>
              )}
            </g>
          )}

          {/* ================================================================= */}
          {/* SCENE 2: ZOOMED ARCHITECTURAL INDIA MAP & SPATIAL WEB (Phases 2-4) */}
          {/* ================================================================= */}
          {(phase >= 2) && (
            <g
              className="transition-all duration-1000 ease-out"
              style={{
                transformOrigin: '230px 220px',
                transform: phase === 2 ? 'scale(0.85)' : 'scale(1)',
                opacity: phase >= 2 ? 1 : 0,
              }}
            >
              {/* Outer Coordinate Lat/Lon Calibration Lines */}
              <path
                d="M 50 155 H 410 M 50 285 H 410 M 215 40 V 420 M 345 40 V 420"
                stroke="currentColor"
                strokeWidth="0.6"
                strokeDasharray="2 4"
                className="text-paper-border dark:text-obsidian-800 opacity-50"
              />

              {/* Stylized High-Definition Geometric Contour of India */}
              <path
                d="M 185 65
                   L 205 70
                   L 215 95
                   L 235 90
                   L 255 105
                   L 285 110
                   L 315 130
                   L 330 155
                   L 355 160
                   L 385 150
                   L 410 160
                   L 415 185
                   L 395 200
                   L 360 195
                   L 345 220
                   L 320 235
                   L 300 270
                   L 275 320
                   L 250 365
                   L 220 405
                   L 205 410
                   L 190 380
                   L 175 330
                   L 155 285
                   L 135 240
                   L 115 220
                   L 135 210
                   L 130 185
                   L 155 165
                   L 165 130
                   L 170 95
                   Z"
                fill="currentColor"
                className="text-paper-200/50 dark:text-obsidian-900/60 transition-colors duration-500"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
              />

              {/* Topographic Internal Boundary Lines (Northern, Coastal, Central) */}
              <path
                d="M 170 95 Q 215 125 285 110"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.8"
                strokeDasharray="2 3"
                className="text-paper-border dark:text-obsidian-800"
              />
              <path
                d="M 135 210 Q 230 235 345 220"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.8"
                strokeDasharray="2 3"
                className="text-paper-border dark:text-obsidian-800"
              />
              <path
                d="M 155 285 Q 225 285 300 270"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.8"
                strokeDasharray="2 3"
                className="text-paper-border dark:text-obsidian-800"
              />

              {/* ============================================================= */}
              {/* SPATIAL WEB / LASER NETWORK BEAM LINES (Phases 3 & 4)        */}
              {/* Radiates outward from Central Hub to all states               */}
              {/* ============================================================= */}
              {(phase >= 3) && (
                <g className="transition-opacity duration-700">
                  {/* Web connection paths */}
                  {WEB_CONNECTIONS.map((conn, idx) => {
                    const p1 = getNodePos(conn.from);
                    const p2 = getNodePos(conn.to);
                    const isFromHub = conn.from === 'delhi';

                    return (
                      <g key={`${conn.from}-${conn.to}-${idx}`}>
                        {/* Static subtle guide line */}
                        <line
                          x1={p1.x}
                          y1={p1.y}
                          x2={p2.x}
                          y2={p2.y}
                          stroke={isFromHub ? '#10B981' : 'currentColor'}
                          strokeWidth={isFromHub ? '1.4' : '0.8'}
                          strokeOpacity={isFromHub ? '0.6' : '0.3'}
                          className={isFromHub ? '' : 'text-paper-muted dark:text-obsidian-muted'}
                        />

                        {/* Animated traveling laser beam pulse */}
                        <line
                          x1={p1.x}
                          y1={p1.y}
                          x2={p2.x}
                          y2={p2.y}
                          stroke="url(#laserBeamGrad)"
                          strokeWidth={isFromHub ? '2' : '1.2'}
                          strokeLinecap="round"
                          className="animate-beam-flow"
                          style={{
                            animationDelay: `${(idx * 0.18) % 2.5}s`,
                          }}
                        />
                      </g>
                    );
                  })}

                  {/* Central Hub Radiating Web Pulse Wave (Delhi NCR) */}
                  <circle
                    cx="215"
                    cy="155"
                    r="40"
                    fill="url(#hubCenterGlow)"
                    className="animate-laser-pulse pointer-events-none"
                  />
                  <circle
                    cx="215"
                    cy="155"
                    r="60"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="0.75"
                    strokeDasharray="4 6"
                    className="animate-radar-wave pointer-events-none"
                  />
                </g>
              )}

              {/* ============================================================= */}
              {/* REGIONAL HUBS & INTERACTIVE NODES (Active in Phase 4)         */}
              {/* ============================================================= */}
              {REGIONAL_NODES.map((node) => {
                const isHovered = hoveredNode?.id === node.id;
                const isCentral = node.type === 'hub';

                return (
                  <g
                    key={node.id}
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={() => onSelectLocality && onSelectLocality(node.name)}
                    className="cursor-pointer group"
                  >
                    {/* Node radar beacon ring */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isCentral ? 8 : 5.5}
                      className={`fill-emerald-500/20 transition-all ${
                        isHovered ? 'scale-150 fill-emerald-500/40' : ''
                      }`}
                    />

                    {/* Outer animated halo ring */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isCentral ? 5 : 3.5}
                      stroke={isCentral ? '#10B981' : '#059669'}
                      strokeWidth="1.5"
                      fill={isHovered ? '#10B981' : '#ffffff'}
                      className="dark:fill-obsidian-950 transition-colors"
                    />

                    {/* Live indicator dot */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isCentral ? 2.5 : 1.8}
                      fill="#10B981"
                      className="animate-pulse"
                    />

                    {/* Node City Label */}
                    <text
                      x={node.x + 7}
                      y={node.y + 3}
                      fill="currentColor"
                      fontSize={isCentral ? '9.5' : '8'}
                      fontFamily="Plus Jakarta Sans"
                      fontWeight={isCentral ? 'bold' : '600'}
                      className="text-paper-ink dark:text-obsidian-ink opacity-85 group-hover:opacity-100 group-hover:fill-emerald-600 dark:group-hover:fill-emerald-400 transition-all"
                    >
                      {node.name}
                    </text>
                  </g>
                );
              })}

              {/* Hover Tooltip Overlay for Regional Nodes */}
              {hoveredNode && (
                <g
                  className="pointer-events-none transition-all duration-200"
                  transform={`translate(${Math.min(hoveredNode.x + 12, 310)}, ${Math.max(hoveredNode.y - 45, 20)})`}
                >
                  <rect
                    width="135"
                    height="46"
                    rx="8"
                    fill="rgba(12, 13, 14, 0.94)"
                    stroke="#10B981"
                    strokeWidth="1"
                    className="shadow-xl"
                  />
                  <text x="10" y="16" fill="#ffffff" fontSize="9.5" fontFamily="Plus Jakarta Sans" fontWeight="bold">
                    {hoveredNode.name}
                  </text>
                  <text x="10" y="27" fill="#94A3B8" fontSize="7.5" fontFamily="Space Mono">
                    {hoveredNode.state}
                  </text>
                  <text x="10" y="38" fill="#10B981" fontSize="8" fontFamily="Space Mono" fontWeight="bold">
                    SPEC: {hoveredNode.score} / 100
                  </text>
                  <circle cx="120" cy="18" r="4" fill="#10B981" />
                </g>
              )}
            </g>
          )}
        </svg>

        {/* Floating Telemetry Coordinates Bar (Bottom) */}
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between pointer-events-none">
          <div className="px-3 py-1 rounded-lg bg-paper-50/90 dark:bg-obsidian-900/90 border border-paper-border dark:border-obsidian-800 text-[10px] font-mono text-paper-muted dark:text-obsidian-muted flex items-center space-x-2 pointer-events-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>36 STATES & UTS LINKED • 458 DISTRICTS</span>
          </div>

          {/* Quick Jump Buttons to individual steps */}
          <div className="flex items-center space-x-1 pointer-events-auto">
            {PHASES.map((p) => (
              <button
                key={p.id}
                onClick={() => handleJumpToPhase(p.id)}
                className={`w-5 h-5 rounded-md text-[9px] font-mono font-bold flex items-center justify-center transition-all ${
                  phase === p.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-paper-200/80 dark:bg-obsidian-800 text-paper-muted dark:text-obsidian-muted hover:text-paper-ink dark:hover:text-white'
                }`}
                title={`${p.title}: ${p.sub}`}
              >
                0{p.id + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
