export const dashboardPeriods = [
  { value: "7d", label: "Últimos 7 días", days: 7 },
  { value: "30d", label: "Últimos 30 días", days: 30 },
  { value: "90d", label: "Últimos 90 días", days: 90 },
] as const;

export type DashboardPeriod = (typeof dashboardPeriods)[number]["value"];

export function parseDashboardPeriod(value: string | string[] | undefined): DashboardPeriod {
  const candidate = Array.isArray(value) ? value[0] : value;
  return dashboardPeriods.some((period) => period.value === candidate) ? (candidate as DashboardPeriod) : "30d";
}

export function getDashboardPeriodBounds(period: DashboardPeriod, now = new Date()) {
  const days = dashboardPeriods.find((item) => item.value === period)?.days ?? 30;
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - days);
  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - days);
  return { currentStart, previousStart, now, days };
}

export function percentage(part: number, total: number) {
  return total ? Math.round((part / total) * 1000) / 10 : null;
}

export function trendPercentage(current: number, previous: number) {
  if (!previous) return current ? null : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
