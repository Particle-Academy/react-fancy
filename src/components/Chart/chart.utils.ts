export const DEFAULT_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#f97316",
];

export function createLinearScale(
  domain: [number, number],
  range: [number, number],
): (value: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  return (value: number) => r0 + ((value - d0) / span) * (r1 - r0);
}

export function linearPath(points: [number, number][]): string {
  if (points.length === 0) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
}

export function monotonePath(points: [number, number][]): string {
  if (points.length < 2) return linearPath(points);
  if (points.length === 2) return linearPath(points);

  const n = points.length;
  const dx: number[] = [];
  const dy: number[] = [];
  const m: number[] = [];

  for (let i = 0; i < n - 1; i++) {
    dx.push(points[i + 1][0] - points[i][0]);
    dy.push(points[i + 1][1] - points[i][1]);
    m.push(dy[i] / (dx[i] || 1));
  }

  // Fritsch-Carlson tangents
  const tangents: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) {
      tangents.push(0);
    } else {
      tangents.push((m[i - 1] + m[i]) / 2);
    }
  }
  tangents.push(m[n - 2]);

  // Clamp tangents
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(m[i]) < 1e-6) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
    } else {
      const a = tangents[i] / m[i];
      const b = tangents[i + 1] / m[i];
      const s = a * a + b * b;
      if (s > 9) {
        const t = 3 / Math.sqrt(s);
        tangents[i] = t * a * m[i];
        tangents[i + 1] = t * b * m[i];
      }
    }
  }

  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dxi = dx[i] / 3;
    const cp1x = p0[0] + dxi;
    const cp1y = p0[1] + tangents[i] * dxi;
    const cp2x = p1[0] - dxi;
    const cp2y = p1[1] - tangents[i + 1] * dxi;
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p1[0]},${p1[1]}`;
  }

  return d;
}

export function areaPath(points: [number, number][], baseline: number): string {
  if (points.length === 0) return "";
  const top = monotonePath(points);
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  return `${top} L${lastPoint[0]},${baseline} L${firstPoint[0]},${baseline} Z`;
}

export function computeTicks(min: number, max: number, count: number = 5): number[] {
  if (count < 2) return [min];
  const ticks: number[] = [];
  const step = (max - min) / (count - 1);
  for (let i = 0; i < count; i++) {
    ticks.push(min + step * i);
  }
  return ticks;
}

export function niceNum(range: number, round: boolean): number {
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / Math.pow(10, exponent);
  let niceFraction: number;
  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else {
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  }
  return niceFraction * Math.pow(10, exponent);
}

export function niceScale(min: number, max: number, tickCount: number = 5): { min: number; max: number; ticks: number[] } {
  if (min === max) {
    return { min: min - 1, max: max + 1, ticks: computeTicks(min - 1, max + 1, tickCount) };
  }
  const range = niceNum(max - min, false);
  const tickSpacing = niceNum(range / (tickCount - 1), true);
  const niceMin = Math.floor(min / tickSpacing) * tickSpacing;
  const niceMax = Math.ceil(max / tickSpacing) * tickSpacing;
  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + tickSpacing * 0.5; v += tickSpacing) {
    ticks.push(Math.round(v * 1e10) / 1e10);
  }
  return { min: niceMin, max: niceMax, ticks };
}
