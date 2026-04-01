type DatedRow = {
  date?: string;
};

function toTimestamp(date?: string): number {
  if (!date) return Number.NEGATIVE_INFINITY;
  const timestamp = new Date(date).getTime();
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

export function sortByMostRecentDate<T extends DatedRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => toTimestamp(b.date) - toTimestamp(a.date));
}
