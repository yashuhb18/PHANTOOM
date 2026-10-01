import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowUp, ArrowDown, ChevronDown, PieChart, Disc } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

// Helper: polar to cartesian coordinates
function polarToCartesian(centerX, centerY, radius, angleInRadians) {
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

// Helper: generate SVG donut or solid pie slice path
function describeDonutSlice(cx, cy, innerRadius, outerRadius, startAngle, endAngle) {
  const angleDiff = endAngle - startAngle;
  const p1 = polarToCartesian(cx, cy, outerRadius, startAngle);
  const p2 = polarToCartesian(cx, cy, outerRadius, endAngle);
  const largeArcFlag = angleDiff > Math.PI ? 1 : 0;

  // Solid Pie Chart (innerRadius <= 0)
  if (innerRadius <= 0) {
    if (angleDiff >= 2 * Math.PI - 0.001) {
      const midAngle = startAngle + Math.PI;
      const pMid = polarToCartesian(cx, cy, outerRadius, midAngle);
      return `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${outerRadius} ${outerRadius} 0 1 1 ${pMid.x.toFixed(1)} ${pMid.y.toFixed(1)} A ${outerRadius} ${outerRadius} 0 1 1 ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} Z`;
    }
    return `M ${cx} ${cy} L ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} Z`;
  }

  // Donut Chart with inner cutout (innerRadius > 0)
  if (angleDiff >= 2 * Math.PI - 0.001) {
    const midAngle = startAngle + Math.PI;
    const pMid = polarToCartesian(cx, cy, outerRadius, midAngle);
    const p3 = polarToCartesian(cx, cy, innerRadius, midAngle);
    const p4 = polarToCartesian(cx, cy, innerRadius, startAngle);
    return `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${outerRadius} ${outerRadius} 0 1 1 ${pMid.x.toFixed(1)} ${pMid.y.toFixed(1)} A ${outerRadius} ${outerRadius} 0 1 1 ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} M ${p4.x.toFixed(1)} ${p4.y.toFixed(1)} A ${innerRadius} ${innerRadius} 0 1 0 ${p3.x.toFixed(1)} ${p3.y.toFixed(1)} A ${innerRadius} ${innerRadius} 0 1 0 ${p4.x.toFixed(1)} ${p4.y.toFixed(1)} Z`;
  }

  const p3 = polarToCartesian(cx, cy, innerRadius, endAngle);
  const p4 = polarToCartesian(cx, cy, innerRadius, startAngle);

  return `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} L ${p3.x.toFixed(1)} ${p3.y.toFixed(1)} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${p4.x.toFixed(1)} ${p4.y.toFixed(1)} Z`;
}

// Helper: generate smooth Catmull-Rom cubic bezier curve
function generateSmoothPath(points) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
}

export function ThreatAnalyticsPage() {
  const { liveEvents } = useWebSocket();
  const [timeRange, setTimeRange] = useState('30m');
  const [chartMode, setChartMode] = useState('donut'); // 'donut' or 'pie'
  const [analyticsData, setAnalyticsData] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [hoverMouseX, setHoverMouseX] = useState(null);
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const lastProcessedEventRef = useRef(null);
  const chartSvgRef = useRef(null);

  // Fetch real-time analytics from backend
  const fetchAnalytics = async (rangeVal = timeRange) => {
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/analytics/realtime?time_range=${rangeVal}`);
      if (res.ok) {
        const json = await res.json();
        setAnalyticsData(json);
      }
    } catch (err) {
      console.error("Failed to load realtime analytics:", err);
    }
  };

  // Initial fetch and on timeRange change
  useEffect(() => {
    fetchAnalytics(timeRange);
    const interval = setInterval(() => {
      fetchAnalytics(timeRange);
    }, 6000);
    return () => clearInterval(interval);
  }, [timeRange]);

  // Reactive Live WebSocket updates: dynamically adjust metrics as new attacks stream in
  useEffect(() => {
    if (!liveEvents || liveEvents.length === 0 || !analyticsData) return;
    const latest = liveEvents[0];
    const eventKey = latest.event_id || latest.id || `${latest.event_type}_${latest.timestamp || Date.now()}`;
    if (lastProcessedEventRef.current === eventKey) return;
    lastProcessedEventRef.current = eventKey;

    // Live update analyticsData state immediately
    setAnalyticsData((prev) => {
      if (!prev) return prev;
      const etype = String(latest.event_type || '').toUpperCase();
      const rawText = JSON.stringify(latest).toLowerCase();

      let targetCat = 'Executables';
      if (etype.includes('PROCESS') || rawText.includes('kill') || rawText.includes('socat') || rawText.includes('bash')) {
        targetCat = 'Executables';
      } else if (etype.includes('INJECTION') || rawText.includes('script') || rawText.includes('.sh') || rawText.includes('.bat')) {
        targetCat = 'Scripts';
      } else if (etype.includes('CANARY') || rawText.includes('.xlsx') || rawText.includes('.env')) {
        targetCat = 'Documents';
      } else if (etype.includes('QUARANTINE') || rawText.includes('.zip') || rawText.includes('exfil')) {
        targetCat = 'Archives';
      } else if (etype.includes('USB') || etype.includes('HARDWARE')) {
        targetCat = 'Images';
      }

      // Update distribution counts
      const newDist = prev.distribution.map((d) => {
        if (d.name === targetCat) {
          return { ...d, count: d.count + 1 };
        }
        return d;
      });

      const newTotal = newDist.reduce((acc, curr) => acc + curr.count, 0);
      const recalculatedDist = newDist.map((d) => ({
        ...d,
        percentage: Math.round((d.count / Math.max(1, newTotal)) * 100),
      }));

      // Update timeline last point
      const newTimeline = [...prev.timeline];
      if (newTimeline.length > 0) {
        const lastIdx = newTimeline.length - 1;
        newTimeline[lastIdx] = {
          ...newTimeline[lastIdx],
          threats: newTimeline[lastIdx].threats + 1,
        };
      }

      const peakItem = newTimeline.reduce((max, pt) => (pt.threats > max.threats ? pt : max), newTimeline[0]);

      return {
        ...prev,
        total_suspicious_events: prev.total_suspicious_events + 1,
        total_threats: newTotal,
        distribution: recalculatedDist,
        timeline: newTimeline,
        peak: {
          time: peakItem.time,
          threats: peakItem.threats,
          x: peakItem.x,
        },
      };
    });
  }, [liveEvents]);

  // Data from state or realistic defaults
  const totalSuspicious = analyticsData?.total_suspicious_events ?? 318;
  const percentageChange = analyticsData?.percentage_change ?? 18;
  const totalThreats = analyticsData?.total_threats ?? 353;
  const distributionData = analyticsData?.distribution ?? [
    { name: 'Executables', count: 113, percentage: 32, color: '#EF4444', textColor: '#F87171' },
    { name: 'Documents', count: 21, percentage: 6, color: '#38BDF8', textColor: '#38BDF8' },
    { name: 'Scripts', count: 21, percentage: 6, color: '#A855F7', textColor: '#C084FC' },
    { name: 'Images', count: 196, percentage: 56, color: '#10B981', textColor: '#34D399' },
    { name: 'Archives', count: 2, percentage: 1, color: '#F97316', textColor: '#FB923C' },
  ];

  const timelineRaw = analyticsData?.timeline ?? [
    { time: '11:20', threats: 28, x: 40 },
    { time: '11:25', threats: 129, x: 163 },
    { time: '11:30', threats: 38, x: 286 },
    { time: '11:35', threats: 103, x: 409 },
    { time: '11:40', threats: 48, x: 532 },
    { time: '11:45', threats: 101, x: 655 },
    { time: '11:50', threats: 70, x: 778 },
  ];

  // Dynamic Scale
  const maxThreatValue = useMemo(() => {
    const rawMax = Math.max(...timelineRaw.map((t) => t.threats), 10);
    if (rawMax <= 50) return 50;
    if (rawMax <= 100) return 100;
    if (rawMax <= 250) return 250;
    if (rawMax <= 500) return 500;
    return Math.ceil(rawMax / 100) * 100;
  }, [timelineRaw]);

  // Compute SVG Points for Waveform
  const chartPoints = useMemo(() => {
    const yTop = 30;
    const yBottom = 195;
    const ySpan = yBottom - yTop;

    return timelineRaw.map((pt) => {
      const clampedThreat = Math.max(0, pt.threats);
      const y = yBottom - (clampedThreat / maxThreatValue) * ySpan;
      return {
        x: pt.x,
        y: Math.max(yTop, Math.min(yBottom, y)),
        time: pt.time,
        threats: pt.threats,
      };
    });
  }, [timelineRaw, maxThreatValue]);

  // Curve and Area Paths
  const smoothCurvePath = useMemo(() => generateSmoothPath(chartPoints), [chartPoints]);
  const areaFillPath = useMemo(() => {
    if (chartPoints.length === 0) return '';
    const firstX = chartPoints[0].x.toFixed(1);
    const lastX = chartPoints[chartPoints.length - 1].x.toFixed(1);
    return `${smoothCurvePath} L ${lastX} 195 L ${firstX} 195 Z`;
  }, [smoothCurvePath, chartPoints]);

  // Peak Point
  const peakPoint = useMemo(() => {
    if (chartPoints.length === 0) return { x: 163, y: 82, time: '11:25', threats: 129 };
    return chartPoints.reduce((max, p) => (p.threats > max.threats ? p : max), chartPoints[0]);
  }, [chartPoints]);

  // Active Tooltip Point (Hovered point takes priority, otherwise stays on peakPoint)
  const currentTooltip = hoveredPoint || peakPoint;

  // Grid Ticks
  const gridTicks = useMemo(() => {
    const steps = 5;
    const ticks = [];
    for (let i = 0; i <= steps; i++) {
      const fraction = (steps - i) / steps;
      const val = Math.round(maxThreatValue * fraction);
      const y = 30 + i * ((195 - 30) / steps);
      ticks.push({ val: String(val), y });
    }
    return ticks;
  }, [maxThreatValue]);

  // ══════════════════════════════════════════════════════════════════════════
  // MOUSE MOVE TRACKING: Snaps dynamically as mouse moves across the graph
  // ══════════════════════════════════════════════════════════════════════════
  const handleChartMouseMove = (e) => {
    if (!chartSvgRef.current || chartPoints.length === 0) return;
    const rect = chartSvgRef.current.getBoundingClientRect();
    const mousePixelX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const svgX = (mousePixelX / rect.width) * 800; // Map client pixel to SVG coordinate [0, 800]
    setHoverMouseX(svgX);

    // Find nearest point on the timeline
    let closest = chartPoints[0];
    let minDiff = Math.abs(chartPoints[0].x - svgX);

    for (let i = 1; i < chartPoints.length; i++) {
      const diff = Math.abs(chartPoints[i].x - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closest = chartPoints[i];
      }
    }

    setHoveredPoint(closest);
  };

  const handleChartMouseLeave = () => {
    setHoveredPoint(null);
    setHoverMouseX(null);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // DONUT & PIE SLICES CALCULATION
  // ══════════════════════════════════════════════════════════════════════════
  const innerRadius = chartMode === 'pie' ? 0 : 65;
  const outerRadius = 105;

  const { donutSlices, dominantSlice } = useMemo(() => {
    let currentAngle = -Math.PI / 2; // Start at 12 o'clock
    const slices = distributionData.map((item) => {
      const angleDelta = (item.percentage / 100) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angleDelta;
      currentAngle = endAngle;

      const midAngle = (startAngle + endAngle) / 2;
      const path = describeDonutSlice(170, 170, innerRadius, outerRadius, startAngle, endAngle);

      return {
        ...item,
        startAngle,
        endAngle,
        midAngle,
        path,
      };
    });

    const dominant = slices.reduce((prev, curr) => (curr.percentage > prev.percentage ? curr : prev), slices[0]);
    return { donutSlices: slices, dominantSlice: dominant };
  }, [distributionData, innerRadius]);

  return (
    <div className="relative min-h-[calc(100vh-80px)] w-full overflow-hidden pb-16">
      <div className="max-w-[1080px] mx-auto space-y-6 relative z-10">
        {/* ══════════════════════════════════════════════════════════════════════
            CARD 1: THREAT ACTIVITY (REAL-TIME ANALYSIS)
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="bg-[#0C0C0E]/95 border border-white/[0.08] hover:border-white/[0.15] transition-all rounded-[32px] p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
          {/* Header Row */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-white font-mono font-bold tracking-[0.22em] text-sm uppercase">
                THREAT ACTIVITY
              </h2>
              <p className="text-neutral-400 font-mono text-[11px] tracking-[0.2em] uppercase mt-0.5">
                REAL-TIME ANALYSIS
              </p>
            </div>

            {/* LIVE Pulse Indicator */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></span>
              </span>
              <span className="text-emerald-400 font-mono text-xs font-bold tracking-widest">
                LIVE
              </span>
            </div>
          </div>

          {/* KPI & Controls Row */}
          <div className="flex items-end justify-between mt-5 mb-2">
            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-extrabold font-mono text-white tracking-tight">
                  {totalSuspicious}
                </span>
                <span className={`flex items-center text-sm font-mono font-bold ${percentageChange >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {percentageChange >= 0 ? (
                    <ArrowUp className="w-3.5 h-3.5 stroke-[3] mr-0.5" />
                  ) : (
                    <ArrowDown className="w-3.5 h-3.5 stroke-[3] mr-0.5" />
                  )}
                  {Math.abs(percentageChange)}%
                </span>
              </div>
              <p className="text-neutral-400 font-mono text-[11px] font-bold tracking-[0.2em] uppercase mt-1">
                SUSPICIOUS EVENTS
              </p>
            </div>

            {/* Time Filter Pill */}
            <div className="relative">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="appearance-none bg-[#18181D] hover:bg-[#202026] text-neutral-300 font-sans text-xs border border-white/[0.12] rounded-full px-4 py-2 pr-9 focus:outline-none focus:border-white/40 transition-colors cursor-pointer"
              >
                <option value="30m">Last 30 min</option>
                <option value="1h">Last 1 hour</option>
                <option value="24h">Last 24 hours</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Line Chart Container with Grid & Glowing Bezier Wave */}
          <div
            className="relative mt-4 pt-4 select-none"
            onMouseMove={handleChartMouseMove}
            onMouseLeave={handleChartMouseLeave}
          >
            {/* Tooltip Card Overlay: Dynamically tracks the mouse cursor horizontally */}
            <div
              className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all duration-150 ease-out"
              style={{
                left: `${(currentTooltip.x / 800) * 100}%`,
                top: `${Math.max(50, currentTooltip.y)}px`,
              }}
            >
              <div className="bg-[#141418] border border-white/[0.15] rounded-xl px-3.5 py-1.5 shadow-2xl text-center relative mb-2">
                <span className="block text-[10px] font-mono text-neutral-400 uppercase tracking-wider leading-none mb-1">
                  {currentTooltip.time}
                </span>
                <span className="block text-xs font-mono font-extrabold text-white leading-tight whitespace-nowrap">
                  {currentTooltip.threats} Threats
                </span>
                {/* Pointer Tip */}
                <div className="w-2.5 h-2.5 bg-[#141418] border-r border-b border-white/[0.15] transform rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2" />
              </div>
            </div>

            <svg
              ref={chartSvgRef}
              viewBox="0 0 800 240"
              className="w-full h-[220px] overflow-visible cursor-crosshair"
            >
              <defs>
                {/* Clean Cyber Area Gradient */}
                <linearGradient id="cyberAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
                </linearGradient>

                {/* Subtle Clean Glow Filter */}
                <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Grid Lines (Horizontal) */}
              {gridTicks.map((grid, i) => (
                <g key={i}>
                  <text
                    x="25"
                    y={grid.y + 4}
                    fill="#52525B"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    {grid.val}
                  </text>
                  <line
                    x1="40"
                    y1={grid.y}
                    x2="780"
                    y2={grid.y}
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeWidth="1"
                  />
                </g>
              ))}

              {/* Cursor Scrubber / Tracking Line (Follows mouse left-right) */}
              <line
                x1={currentTooltip.x}
                y1="30"
                x2={currentTooltip.x}
                y2="195"
                stroke="#38BDF8"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.85"
                className="transition-all duration-150 ease-out"
              />

              {/* Continuous subtle mouse guide */}
              {hoverMouseX !== null && (
                <line
                  x1={hoverMouseX}
                  y1="30"
                  x2={hoverMouseX}
                  y2="195"
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth="1"
                  className="pointer-events-none"
                />
              )}

              {/* Area Fill */}
              {areaFillPath && (
                <path
                  d={areaFillPath}
                  fill="url(#cyberAreaGradient)"
                  className="transition-all duration-500 ease-out"
                />
              )}

              {/* Glowing Waveform Path */}
              {smoothCurvePath && (
                <path
                  d={smoothCurvePath}
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="2.5"
                  filter="url(#neonGlow)"
                  className="transition-all duration-500 ease-out"
                />
              )}

              {/* Active Dot on Curve (Moves right/left with tooltip) */}
              <circle
                cx={currentTooltip.x}
                cy={currentTooltip.y}
                r="8"
                fill="rgba(56, 189, 248, 0.25)"
                className="transition-all duration-150 ease-out"
              />
              <circle
                cx={currentTooltip.x}
                cy={currentTooltip.y}
                r="5"
                fill="#38BDF8"
                stroke="#FFFFFF"
                strokeWidth="2"
                className="transition-all duration-150 ease-out"
              />

              {/* Interactive Hit Bands across entire width to ensure 100% responsiveness */}
              {chartPoints.map((pt, idx) => {
                const prevX = idx > 0 ? (chartPoints[idx - 1].x + pt.x) / 2 : 20;
                const nextX = idx < chartPoints.length - 1 ? (chartPoints[idx + 1].x + pt.x) / 2 : 790;
                return (
                  <rect
                    key={`hitband-${idx}`}
                    x={prevX}
                    y="0"
                    width={nextX - prevX}
                    height="220"
                    fill="transparent"
                    className="cursor-crosshair"
                    onMouseEnter={() => setHoveredPoint(pt)}
                  />
                );
              })}

              {/* X-Axis Timestamps */}
              {chartPoints.map((tick, i) => {
                const isActive = tick.time === currentTooltip.time;
                return (
                  <text
                    key={i}
                    x={tick.x}
                    y="218"
                    fill={isActive ? '#38BDF8' : '#71717A'}
                    fontWeight={isActive ? 'bold' : 'normal'}
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                    className="transition-colors duration-150"
                  >
                    {tick.time}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            CARD 2: THREAT DISTRIBUTION (FILE TYPE ANALYSIS - PIE / DONUT)
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="bg-[#0C0C0E]/95 border border-white/[0.08] hover:border-white/[0.15] transition-all rounded-[32px] p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
          {/* Header Row */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h2 className="text-white font-mono font-bold tracking-[0.22em] text-sm uppercase">
                THREAT DISTRIBUTION
              </h2>
              <p className="text-neutral-400 font-mono text-[11px] tracking-[0.2em] uppercase mt-0.5">
                FILE TYPE ANALYSIS
              </p>
            </div>

            {/* Controls: Mode Toggle (DONUT / PIE) + Time Filter */}
            <div className="flex items-center gap-3">
              {/* Donut vs Solid Pie Switcher */}
              <div className="flex items-center bg-[#18181D] border border-white/[0.12] rounded-full p-0.5">
                <button
                  onClick={() => setChartMode('donut')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
                    chartMode === 'donut'
                      ? 'bg-white text-black shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Switch to Donut View"
                >
                  <Disc className="w-3 h-3" />
                  DONUT
                </button>
                <button
                  onClick={() => setChartMode('pie')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
                    chartMode === 'pie'
                      ? 'bg-white text-black shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Switch to Solid Pie View"
                >
                  <PieChart className="w-3 h-3" />
                  PIE
                </button>
              </div>

              {/* Time Filter Pill */}
              <div className="relative">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="appearance-none bg-[#18181D] hover:bg-[#202026] text-neutral-300 font-sans text-xs border border-white/[0.12] rounded-full px-4 py-2 pr-9 focus:outline-none focus:border-white/40 transition-colors cursor-pointer"
                >
                  <option value="30m">Last 30 min</option>
                  <option value="1h">Last 1 hour</option>
                  <option value="24h">Last 24 hours</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Grid Layout: Donut/Pie Chart with Callout Lines + Legend Table Box */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Donut / Pie Chart with Interactive Hover & Slices */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center relative min-h-[320px]">
              <svg viewBox="0 0 340 340" className="w-[320px] h-[320px] overflow-visible">
                <defs>
                  {/* Subtle Slice Glow */}
                  <filter id="sliceGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Slices calculated dynamically from real SQLite data */}
                <g>
                  {donutSlices.map((slice, idx) => {
                    if (slice.percentage <= 0) return null;
                    const isHovered = hoveredSlice?.name === slice.name;
                    return (
                      <path
                        key={idx}
                        d={slice.path}
                        fill={slice.color}
                        stroke={isHovered ? '#FFFFFF' : 'rgba(12, 12, 14, 0.4)'}
                        strokeWidth={isHovered ? 2.5 : 1}
                        filter={isHovered ? 'url(#sliceGlow)' : undefined}
                        className="transition-all duration-300 origin-center cursor-pointer"
                        style={{
                          transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                          transformOrigin: '170px 170px',
                        }}
                        onMouseEnter={() => setHoveredSlice(slice)}
                        onMouseLeave={() => setHoveredSlice(null)}
                      >
                        <title>{`${slice.name}: ${slice.count} threats (${slice.percentage}%)`}</title>
                      </path>
                    );
                  })}
                </g>

                {/* Donut Center Display (Visible in DONUT mode) */}
                {chartMode === 'donut' && (
                  <>
                    <circle cx="170" cy="170" r="63" fill="#0C0C0E" className="transition-all duration-300" />
                    {hoveredSlice ? (
                      <g className="transition-all duration-200">
                        <text
                          x="170"
                          y="158"
                          fill={hoveredSlice.textColor}
                          fontSize="22"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {hoveredSlice.count}
                        </text>
                        <text
                          x="170"
                          y="176"
                          fill="#FFFFFF"
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight="bold"
                          letterSpacing="0.08em"
                          textAnchor="middle"
                        >
                          {hoveredSlice.name.toUpperCase()}
                        </text>
                        <text
                          x="170"
                          y="190"
                          fill="#A1A1AA"
                          fontSize="8.5"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {hoveredSlice.percentage}% SHARE
                        </text>
                      </g>
                    ) : (
                      <g className="transition-all duration-200">
                        <text
                          x="170"
                          y="166"
                          fill="#FFFFFF"
                          fontSize="24"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {totalThreats}
                        </text>
                        <text
                          x="170"
                          y="184"
                          fill="#71717A"
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight="bold"
                          letterSpacing="0.1em"
                          textAnchor="middle"
                        >
                          TOTAL THREATS
                        </text>
                      </g>
                    )}
                  </>
                )}

                {/* ── DYNAMIC CALLOUT LABELS & GUIDELINES ── */}
                {donutSlices.map((slice, idx) => {
                  if (slice.percentage < 3) return null; // Avoid overlapping lines on microscopic slices
                  const isDominant = slice.name === dominantSlice?.name;
                  const isHovered = hoveredSlice?.name === slice.name;
                  const cos = Math.cos(slice.midAngle);
                  const sin = Math.sin(slice.midAngle);
                  const isRight = cos >= 0;

                  const x1 = 170 + 106 * cos;
                  const y1 = 170 + 106 * sin;
                  const x2 = 170 + 128 * cos;
                  const y2 = 170 + 128 * sin;
                  const x3 = isRight ? x2 + 18 : x2 - 18;
                  const y3 = y2;

                  return (
                    <g
                      key={idx}
                      className="transition-all duration-300 cursor-pointer"
                      onMouseEnter={() => setHoveredSlice(slice)}
                      onMouseLeave={() => setHoveredSlice(null)}
                    >
                      {/* Pointer Line */}
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={slice.color}
                        strokeWidth={isDominant || isHovered ? '2' : '1.2'}
                        opacity={isDominant || isHovered ? '1' : '0.75'}
                      />
                      <line
                        x1={x2}
                        y1={y2}
                        x2={x3}
                        y2={y3}
                        stroke={slice.color}
                        strokeWidth={isDominant || isHovered ? '2' : '1.2'}
                        opacity={isDominant || isHovered ? '1' : '0.75'}
                      />

                      {/* Dominant Highlight Pill or Percentage Text */}
                      {isDominant ? (
                        <g transform={`translate(${isRight ? x3 - 2 : x3 - 42}, ${y3 - 12})`}>
                          <rect width="44" height="24" rx="12" fill={slice.color} />
                          <text
                            x="22"
                            y="16"
                            fill="#000000"
                            fontSize="12"
                            fontWeight="bold"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            {slice.percentage}%
                          </text>
                        </g>
                      ) : (
                        <text
                          x={isRight ? x3 + 5 : x3 - 5}
                          y={y3 + 4}
                          fill={slice.textColor}
                          fontSize="12"
                          fontWeight={isHovered ? 'bold' : 'normal'}
                          fontFamily="monospace"
                          textAnchor={isRight ? 'start' : 'end'}
                        >
                          {slice.percentage}%
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Informative Sub-badge for Solid Pie Mode */}
              {chartMode === 'pie' && (
                <div className="mt-3 text-center">
                  <div className="inline-flex items-center gap-2 bg-[#141418] border border-white/[0.1] rounded-full px-4 py-1.5 shadow-lg">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: hoveredSlice ? hoveredSlice.color : '#38BDF8' }}
                    />
                    <span className="font-mono text-xs text-white font-bold tracking-wider">
                      {hoveredSlice
                        ? `${hoveredSlice.name}: ${hoveredSlice.count} threats (${hoveredSlice.percentage}%)`
                        : `Total Threats: ${totalThreats}`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Exact Match Dynamic Legend Card Table with Hover Sync */}
            <div className="lg:col-span-6">
              <div className="bg-[#121216] border border-white/[0.08] rounded-2xl p-6 divide-y divide-white/[0.06] shadow-xl">
                {distributionData.map((item, idx) => {
                  const isHovered = hoveredSlice?.name === item.name;
                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredSlice(item)}
                      onMouseLeave={() => setHoveredSlice(null)}
                      className={`flex items-center justify-between py-3.5 first:pt-0 last:pb-0 px-2 rounded-lg transition-all duration-200 cursor-pointer ${
                        isHovered ? 'bg-white/[0.06] border border-white/[0.15] shadow-sm' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm transition-transform duration-200"
                          style={{
                            backgroundColor: item.color,
                            transform: isHovered ? 'scale(1.25)' : 'scale(1)',
                          }}
                        />
                        <span className={`text-sm font-sans font-medium transition-colors ${
                          isHovered ? 'text-white font-semibold' : 'text-neutral-200'
                        }`}>
                          {item.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-8 font-mono text-sm">
                        <span className="text-white font-bold w-12 text-right">
                          {item.count}
                        </span>
                        <span
                          className="font-bold w-12 text-right"
                          style={{ color: item.textColor }}
                        >
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
