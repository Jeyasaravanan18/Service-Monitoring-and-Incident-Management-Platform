import React, { useMemo, memo } from "react";

export const TelemetryChart = memo(function TelemetryChart({ data = [], width = "100%", height = 120, color = "var(--color-brand)" }) {
  if (!data || data.length === 0) {
    return <div className="subtle" style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>No telemetry data.</div>;
  }

  // Handle case where we only have 1 data point
  const plotData = data.length === 1 ? [data[0], data[0]] : data;

  const min = Math.min(...plotData);
  const max = Math.max(...plotData);
  const range = max - min === 0 ? 1 : max - min;
  
  // Padding for the chart bounds
  const paddingY = 20; 

  // Normalize points to SVG coordinates using useMemo to avoid recalculation on re-renders
  const { points, areaD, pathD } = useMemo(() => {
    const pts = plotData.map((val, i) => {
      const x = (i / (plotData.length - 1)) * 1000;
      const normalizedY = (val - min) / range;
      const y = 100 - paddingY - (normalizedY * (100 - paddingY * 2));
      return `${x},${y}`;
    });
    const pD = `M ${pts.join(" L ")}`;
    return {
      points: pts,
      pathD: pD,
      areaD: `${pD} L 1000,100 L 0,100 Z`
    };
  }, [plotData, min, range, paddingY]);

  return (
    <div style={{ width, height, position: "relative" }}>
      <svg viewBox="0 0 1000 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%", overflow: "visible" }}>
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Grid lines */}
        <line x1="0" y1="20" x2="1000" y2="20" stroke="var(--color-border-strong)" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="0" y1="50" x2="1000" y2="50" stroke="var(--color-border-strong)" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="0" y1="80" x2="1000" y2="80" stroke="var(--color-border-strong)" strokeWidth="1" strokeDasharray="4 4" />

        {/* Area fill */}
        <path d={areaD} fill="url(#areaGradient)" />

        {/* Stroke line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="3" filter="url(#glow)" strokeLinejoin="round" />
        
        {/* Plot points */}
        {plotData.map((val, i) => {
          const x = (i / (plotData.length - 1)) * 1000;
          const normalizedY = (val - min) / range;
          const y = 100 - paddingY - (normalizedY * (100 - paddingY * 2));
          return (
            <circle key={i} cx={x} cy={y} r="4" fill={color} stroke="#000" strokeWidth="2" />
          );
        })}
      </svg>
      <div style={{ position: "absolute", top: -8, left: 0, fontSize: 10, color: "var(--color-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>{Math.round(max)}ms</div>
      <div style={{ position: "absolute", bottom: -8, left: 0, fontSize: 10, color: "var(--color-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>{Math.round(min)}ms</div>
    </div>
  );
});
