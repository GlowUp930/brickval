export interface ValuationHistoryPoint {
  date: string;
  price_usd: number;
  source: string;
}

export interface ValuationChartPoint extends ValuationHistoryPoint {
  x: number;
  y: number;
  total: number;
}

export interface ValuationChartModel {
  points: ValuationChartPoint[];
  linePath: string;
  areaPath: string;
  low: number | null;
  high: number | null;
  change: number | null;
}

export function buildValuationChart(
  history: ValuationHistoryPoint[],
  width: number,
  height: number,
  bottom: number,
  quantity = 1
): ValuationChartModel {
  const clean = history
    .filter((point) => point.date && Number.isFinite(point.price_usd))
    .sort((a, b) => a.date.localeCompare(b.date));
  const values = clean.map((point) => point.price_usd * quantity);
  const low = values.length ? Math.min(...values) : null;
  const high = values.length ? Math.max(...values) : null;
  const range = Math.max((high ?? 0) - (low ?? 0), 1);
  const usableHeight = Math.min(150, Math.max(40, height - 54));
  const points = clean.map((point, index) => {
    const total = point.price_usd * quantity;
    return {
      ...point,
      total,
      x: clean.length > 1 ? (index * width) / (clean.length - 1) : width / 2,
      y: low === high ? height / 2 : bottom - ((total - (low ?? 0)) / range) * usableHeight,
    };
  });
  const linePath = smoothPath(points);
  const first = points[0];
  const last = points[points.length - 1];
  const areaPath = linePath && first && last
    ? `${linePath} L ${last.x} ${bottom} L ${first.x} ${bottom} Z`
    : "";
  const firstValue = values[0] ?? null;
  const lastValue = values[values.length - 1] ?? null;

  return {
    points,
    linePath,
    areaPath,
    low,
    high,
    change: firstValue === null || lastValue === null ? null : lastValue - firstValue,
  };
}

export function smoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  const smoothing = 0.18;
  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const next = points[index + 1] ?? point;
    const previousControl = points[index - 2] ?? previous;
    const cp1x = previous.x + (point.x - previousControl.x) * smoothing;
    const cp1y = previous.y + (point.y - previousControl.y) * smoothing;
    const cp2x = point.x - (next.x - previous.x) * smoothing;
    const cp2y = point.y - (next.y - previous.y) * smoothing;
    return `${path} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x} ${point.y}`;
  }, "");
}
