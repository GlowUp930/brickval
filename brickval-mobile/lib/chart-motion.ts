export type ChartLinePoint = { x: number; y: number };

export function sampleChartLine(points: ChartLinePoint[], chartWidth: number, sampleCount = 28) {
  const sorted = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y)).sort((a, b) => a.x - b.x);
  if (sorted.length === 0) return [];
  if (sorted.length === 1) {
    return Array.from({ length: sampleCount }, (_, index) => ({
      x: sampleCount === 1 ? chartWidth / 2 : (index * chartWidth) / (sampleCount - 1),
      y: sorted[0].y,
    }));
  }

  return Array.from({ length: sampleCount }, (_, index) => {
    const x = sampleCount === 1 ? chartWidth / 2 : (index * chartWidth) / (sampleCount - 1);
    let rightIndex = 1;
    while (rightIndex < sorted.length && sorted[rightIndex].x < x) {
      rightIndex += 1;
    }

    if (rightIndex >= sorted.length) {
      return { x, y: sorted[sorted.length - 1].y };
    }

    const left = sorted[rightIndex - 1];
    const right = sorted[rightIndex];
    const span = right.x - left.x || 1;
    const t = Math.max(0, Math.min(1, (x - left.x) / span));
    return { x, y: left.y + (right.y - left.y) * t };
  });
}

export function interpolateChartLine(from: ChartLinePoint[], to: ChartLinePoint[], progress: number) {
  const length = Math.min(from.length, to.length);
  return Array.from({ length }, (_, index) => ({
    x: from[index].x,
    y: from[index].y + (to[index].y - from[index].y) * progress,
  }));
}

export function buildChartAreaPath(points: ChartLinePoint[], chartBottom: number) {
  if (points.length === 0) return "";
  const first = points[0];
  const last = points[points.length - 1];
  const linePath = points.length === 1 ? `M ${first.x} ${first.y}` : points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const next = points[index + 1] ?? point;
    const previousControl = points[index - 2] ?? previous;
    const smoothing = 0.18;
    const cp1x = previous.x + (point.x - previousControl.x) * smoothing;
    const cp1y = previous.y + (point.y - previousControl.y) * smoothing;
    const cp2x = point.x - (next.x - previous.x) * smoothing;
    const cp2y = point.y - (next.y - previous.y) * smoothing;
    return `${path} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x} ${point.y}`;
  }, "");
  return `${linePath} L ${last.x} ${chartBottom} L ${first.x} ${chartBottom} Z`;
}
