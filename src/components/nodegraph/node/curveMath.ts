import { Coord } from '../../../utils/adjustments';

/**
 * Monotone cubic interpolation through the control points, returned as an SVG
 * path in a 0..255 viewBox (y flipped so 0 is bottom). Mirrors the curve math
 * used by the full Curves panel so the node preview matches the backend LUT.
 */
export function getCurvePath(points: Array<Coord>): string {
  if (points.length < 2) return '';

  const n = points.length;
  const deltas: number[] = [];
  const ms: number[] = [];

  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    deltas.push(dx === 0 ? (dy > 0 ? 1e6 : dy < 0 ? -1e6 : 0) : dy / dx);
  }

  ms.push(deltas[0]);
  for (let i = 1; i < n - 1; i++) {
    ms.push(deltas[i - 1] * deltas[i] <= 0 ? 0 : (deltas[i - 1] + deltas[i]) / 2);
  }
  ms.push(deltas[n - 2]);

  for (let i = 0; i < n - 1; i++) {
    if (deltas[i] === 0) {
      ms[i] = 0;
      ms[i + 1] = 0;
    } else {
      const alpha = ms[i] / deltas[i];
      const beta = ms[i + 1] / deltas[i];
      const tau = alpha * alpha + beta * beta;
      if (tau > 9) {
        const scale = 3.0 / Math.sqrt(tau);
        ms[i] = scale * alpha * deltas[i];
        ms[i + 1] = scale * beta * deltas[i];
      }
    }
  }

  let path =
    points[0].x > 0
      ? `M 0 ${255 - points[0].y} L ${points[0].x} ${255 - points[0].y}`
      : `M ${points[0].x} ${255 - points[0].y}`;

  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dx = p1.x - p0.x;
    const cp1x = p0.x + dx / 3.0;
    const cp1y = p0.y + (ms[i] * dx) / 3.0;
    const cp2x = p1.x - dx / 3.0;
    const cp2y = p1.y - (ms[i + 1] * dx) / 3.0;
    path += ` C ${cp1x.toFixed(2)} ${(255 - cp1y).toFixed(2)}, ${cp2x.toFixed(2)} ${(255 - cp2y).toFixed(2)}, ${p1.x} ${255 - p1.y}`;
  }

  if (points[n - 1].x < 255) {
    path += ` L 255 ${255 - points[n - 1].y}`;
  }

  return path;
}
