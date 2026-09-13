import React from 'react';

/**
 * LogoMark: Bespoke architectural emblem featuring a precision magnifying
 * loupe focused over the silhouette of India, with coordinate reticle and
 * an emerald pulse beacon.
 */
export default function LogoMark({ className = 'w-10 h-10' }) {
  return (
    <div className={`relative ${className} rounded-xl bg-paper-ink dark:bg-white flex items-center justify-center shadow-paper group-hover:scale-105 transition-transform duration-300 select-none`}>
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-6 h-6 text-paper-50 dark:text-obsidian-950"
      >
        <defs>
          {/* Subtle inner lens gradient */}
          <radialGradient id="lensGlow" cx="45%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
          </radialGradient>
        </defs>

        {/* Magnifying Glass Handle (extending southeast) */}
        <line
          x1="24.5"
          y1="24.5"
          x2="32"
          y2="32"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          opacity="0.9"
        />
        {/* Loupe grip notch */}
        <line
          x1="28"
          y1="28"
          x2="30.5"
          y2="30.5"
          stroke="#10B981"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Magnifying Loupe Outer Rim */}
        <circle
          cx="15"
          cy="15"
          r="10.5"
          stroke="currentColor"
          strokeWidth="2.2"
        />

        {/* Lens Glass Surface with subtle radial glow */}
        <circle
          cx="15"
          cy="15"
          r="9.5"
          fill="url(#lensGlow)"
        />

        {/* Precision coordinate grid markings inside lens */}
        <circle
          cx="15"
          cy="15"
          r="9.5"
          stroke="currentColor"
          strokeWidth="0.75"
          strokeDasharray="2 2"
          opacity="0.3"
        />

        {/* Stylized Silhouette of the Map of India inside the lens */}
        <path
          d="M 14.8 7.5
             L 16.2 8.2
             L 15.6 9.3
             L 17.0 9.8
             L 19.5 10.8
             L 21.0 10.4
             L 21.6 11.6
             L 20.2 12.4
             L 18.2 13.0
             L 17.5 15.5
             L 16.5 18.0
             L 15.5 21.2
             L 14.8 21.6
             L 14.0 18.5
             L 12.8 15.6
             L 10.2 14.5
             L 9.4 13.5
             L 11.2 12.8
             L 11.4 11.5
             L 12.8 10.0
             Z"
          fill="currentColor"
          fillOpacity="0.45"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* Coordinate Reticle / Crosshair (+ at center of India) */}
        <line x1="15" y1="11.5" x2="15" y2="17.5" stroke="#10B981" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="12" y1="14.5" x2="18" y2="14.5" stroke="#10B981" strokeWidth="1.2" strokeLinecap="round" />

        {/* Pulsing Focal Beacon Core (Emerald live indicator) */}
        <circle cx="15" cy="14.5" r="1.8" fill="#10B981" />
        <circle cx="15" cy="14.5" r="3.2" stroke="#10B981" strokeWidth="0.7" strokeDasharray="1.5 1.5" opacity="0.8" />
      </svg>
    </div>
  );
}
