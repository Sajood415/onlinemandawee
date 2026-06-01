export type SalesSummaryGranularity = "day" | "week" | "month";

export function getPeriodKey(date: Date, granularity: SalesSummaryGranularity): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  if (granularity === "day") {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  if (granularity === "month") {
    return `${year}-${String(month).padStart(2, "0")}`;
  }

  const tmp = new Date(Date.UTC(year, date.getUTCMonth(), day));
  const weekday = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((tmp.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7
  );
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function formatPeriodLabel(
  periodKey: string,
  granularity: SalesSummaryGranularity
): string {
  if (granularity === "day") {
    const [y, m, d] = periodKey.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  if (granularity === "month") {
    const [y, m] = periodKey.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  const [year, weekPart] = periodKey.split("-W");
  return `Week ${weekPart}, ${year}`;
}
