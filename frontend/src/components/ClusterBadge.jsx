import React from 'react';
import { Layers } from 'lucide-react';

const CLUSTER_STYLES = {
  0: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60',
    dot: 'bg-emerald-500',
  },
  1: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60',
    dot: 'bg-blue-500',
  },
  2: {
    badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/60',
    dot: 'bg-purple-500',
  },
  3: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60',
    dot: 'bg-amber-500',
  },
};

export default function ClusterBadge({ cluster, showIcon = true, size = 'md' }) {
  if (!cluster) return null;

  const clusterId = typeof cluster === 'object' ? cluster.id : cluster;
  const label = typeof cluster === 'object' ? cluster.label : `Archetype Cluster ${cluster}`;
  const description = typeof cluster === 'object' ? cluster.description : '';

  const style = CLUSTER_STYLES[clusterId % 4] || CLUSTER_STYLES[0];
  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <div
      title={description || label}
      className={`inline-flex items-center space-x-1.5 rounded-full font-medium border shadow-xs transition-colors ${style.badge} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} animate-pulse`} />
      {showIcon && <Layers className="w-3 h-3 opacity-70" />}
      <span className="truncate max-w-[170px] sm:max-w-none">{label}</span>
    </div>
  );
}
