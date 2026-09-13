import React from 'react';
import {
  Radar,
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

const PALETTE = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B'];

export default function RadarChart({ data, keys = ['score'], isDark = false, height = 320 }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
        No radar metrics available
      </div>
    );
  }

  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const textColor = isDark ? '#94a3b8' : '#475569';

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadar cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid stroke={gridColor} strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fill: textColor, fontSize: 11, fontWeight: 500 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: isDark ? '#64748b' : '#94a3b8', fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              borderColor: isDark ? '#1e293b' : '#e2e8f0',
              borderRadius: '0.75rem',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
              fontSize: '12px',
              color: isDark ? '#f8fafc' : '#0f172a',
            }}
          />
          {keys.length > 1 && <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />}
          {keys.map((keyName, idx) => {
            const color = PALETTE[idx % PALETTE.length];
            return (
              <Radar
                key={keyName}
                name={keyName}
                dataKey={keyName}
                stroke={color}
                fill={color}
                fillOpacity={keys.length === 1 ? 0.35 : 0.2}
                strokeWidth={2}
              />
            );
          })}
        </RechartsRadar>
      </ResponsiveContainer>
    </div>
  );
}
