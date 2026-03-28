'use client';

export default function ActivityChart({ labels, data }) {
  const W = 320, H = 130;
  const pad = { t: 24, b: 28, l: 10, r: 10 };
  const chartW = W - pad.l - pad.r;
  const chartH = H - pad.t - pad.b;
  const max = Math.max(...data, 1);
  const n = data.length;

  const pts = data.map((v, i) => ({
    x: pad.l + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW),
    y: pad.t + chartH - (v / max) * chartH,
  }));

  // Smooth cubic bezier path
  let linePath = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cpx = (pts[i].x + pts[i - 1].x) / 2;
    linePath += ` C ${cpx} ${pts[i - 1].y} ${cpx} ${pts[i].y} ${pts[i].x} ${pts[i].y}`;
  }
  const areaPath = `${linePath} L ${pts[n - 1].x} ${pad.t + chartH} L ${pts[0].x} ${pad.t + chartH} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', overflow: 'visible', display: 'block' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5B4FFF" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#5B4FFF" stopOpacity="0.01" />
        </linearGradient>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#5B4FFF" />
          <stop offset="55%" stopColor="#C026D3" />
          <stop offset="100%" stopColor="#FB7185" />
        </linearGradient>
      </defs>

      {/* Horizontal grid lines */}
      {[0.25, 0.5, 0.75, 1].map(t => {
        const y = pad.t + chartH - t * chartH;
        return (
          <line
            key={t}
            x1={pad.l}
            y1={y}
            x2={W - pad.r}
            y2={y}
            stroke="rgba(91,79,255,0.08)"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
        );
      })}

      {/* Area fill */}
      <path d={areaPath} fill="url(#activityGrad)" />

      {/* Gradient line */}
      <path
        d={linePath}
        fill="none"
        stroke="url(#lineGrad)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dot + value labels */}
      {pts.map((p, i) => (
        <g key={i}>
          {data[i] > 0 && (
            <>
              <circle cx={p.x} cy={p.y} r="5" fill="white" stroke="url(#lineGrad)" strokeWidth="2" />
              <text
                x={p.x}
                y={p.y - 10}
                textAnchor="middle"
                fontSize="9.5"
                fontWeight="700"
                fontFamily="system-ui, sans-serif"
                fill="#5B4FFF"
              >
                {data[i]}
              </text>
            </>
          )}
          {/* Month labels */}
          <text
            x={p.x}
            y={H - 4}
            textAnchor="middle"
            fontSize="9"
            fontFamily="system-ui, sans-serif"
            fill="var(--ink-muted)"
          >
            {labels[i]}
          </text>
        </g>
      ))}
    </svg>
  );
}
