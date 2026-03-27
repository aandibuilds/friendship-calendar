'use client';
import { useEffect, useRef } from 'react';

export default function BarChart({ labels, data, color }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const W = canvas.parentElement.clientWidth || 460, H = 110;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    const max = Math.max(...data, 1);
    const pad = { t: 14, b: 24, l: 8, r: 8 };
    const bw = (W - pad.l - pad.r) / labels.length;
    ctx.font = '500 10.5px DM Sans,sans-serif';
    ctx.textAlign = 'center';
    labels.forEach((l, i) => {
      const x = pad.l + i * bw + bw / 2;
      ctx.fillStyle = '#7A7268'; ctx.fillText(l, x, H - 5);
      const bh = data[i] / max * (H - pad.t - pad.b);
      if (bh > 0) {
        const bx = x - bw * 0.27, bww = bw * 0.54, by = H - pad.b - bh, r = 4;
        const grad = ctx.createLinearGradient(0, by, 0, by + bh);
        grad.addColorStop(0, color); grad.addColorStop(1, color + '55');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(bx + r, by); ctx.lineTo(bx + bww - r, by);
        ctx.arcTo(bx + bww, by, bx + bww, by + r, r); ctx.lineTo(bx + bww, by + bh);
        ctx.lineTo(bx, by + bh); ctx.arcTo(bx, by, bx + r, by, r); ctx.closePath(); ctx.fill();
        if (data[i] > 0) { ctx.fillStyle = color; ctx.fillText(data[i], x, by - 3); }
      }
    });
  }, [labels, data, color]);
  return <canvas ref={ref} style={{ width: '100%', display: 'block' }} />;
}
