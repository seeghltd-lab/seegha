export default function Sparkline({ data, color = 'var(--accent)', height = 32 }) {
  if (!data || data.length < 2) return null;
  const w = 120, h = height;
  const min = Math.min(...data), max = Math.max(...data), span = max - min || 1;
  const pts = data.map((v, i) => [i / (data.length - 1) * w, h - ((v - min) / span) * (h - 4) - 2]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = d + ` L ${w} ${h} L 0 ${h} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"
      style={{ width: '100%', height, display: 'block', marginTop: 6 }}>
      <path d={area} fill={color} opacity="0.10" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0].toFixed(1)} cy={last[1].toFixed(1)} r="2.5" fill={color} />
    </svg>
  );
}

export function genSpark(seed, n = 14, trend = 0) {
  const arr = [];
  let v = 50;
  for (let i = 0; i < n; i++) {
    const r = (Math.sin(seed * 9301 + i * 49297 + 233) * 0.5 + 0.5);
    v = v + (r - 0.48) * 18 + trend;
    v = Math.max(8, Math.min(92, v));
    arr.push(Math.round(v));
  }
  return arr;
}
