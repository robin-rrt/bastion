import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { AggregatesResponse, DailyRow, KpiData } from "@/types";

interface DailyAggregateRow {
  date: Date;
  missiles_launched: bigint;
  missiles_intercepted: bigint;
  drones_launched: bigint;
  drones_intercepted: bigint;
  other_launched: bigint;
  other_intercepted: bigint;
}

interface SubcategoryAggRow {
  subcategory: string | null;
  launched: bigint;
  intercepted: bigint;
}

function pct(intercepted: number, launched: number): number {
  if (launched === 0) return 0;
  return Math.round((intercepted / launched) * 100 * 10) / 10;
}

// Validate and parse a YYYY-MM-DD string — returns null if invalid
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function parseDate(s: string | null): Date | null {
  if (!s || !DATE_RE.test(s)) return null;
  const d = new Date(s + "T00:00:00Z");
  return isNaN(d.getTime()) ? null : d;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Strict date validation — rejects anything that isn't YYYY-MM-DD
  const dateFrom = parseDate(searchParams.get("from")) ?? new Date("1970-01-01T00:00:00Z");
  const dateTo   = parseDate(searchParams.get("to"))   ?? new Date("2099-12-31T23:59:59Z");

  try {
    // All queries use parameterised $queryRaw (tagged template) — no raw string interpolation
    const [rows, subcategoryRows, lastUpdatedResult] = await Promise.all([
      db.$queryRaw<DailyAggregateRow[]>`
        SELECT * FROM daily_aggregates
        WHERE date >= ${dateFrom}::date AND date <= ${dateTo}::date
        ORDER BY date
      `,
      db.$queryRaw<SubcategoryAggRow[]>`
        SELECT subcategory,
          SUM(COALESCE("countLaunched", 0))    AS launched,
          SUM(COALESCE("countIntercepted", 0)) AS intercepted
        FROM events
        WHERE category = 'MISSILE'
          AND "isCumulative" = false
          AND date >= ${dateFrom}::date AND date <= ${dateTo}::date
        GROUP BY subcategory
      `,
      db.rawTweet.findFirst({
        orderBy: { ingestedAt: "desc" },
        select: { ingestedAt: true },
      }),
    ]);

    const daily: DailyRow[] = rows.map((r) => ({
      date: r.date.toISOString().split("T")[0],
      missilesLaunched: Number(r.missiles_launched),
      missilesIntercepted: Number(r.missiles_intercepted),
      dronesLaunched: Number(r.drones_launched),
      dronesIntercepted: Number(r.drones_intercepted),
      otherLaunched: Number(r.other_launched),
      otherIntercepted: Number(r.other_intercepted),
    }));

    // KPI totals from daily view
    const totals = daily.reduce(
      (acc, row) => ({
        missilesLaunched: acc.missilesLaunched + row.missilesLaunched,
        missilesIntercepted: acc.missilesIntercepted + row.missilesIntercepted,
        dronesLaunched: acc.dronesLaunched + row.dronesLaunched,
        dronesIntercepted: acc.dronesIntercepted + row.dronesIntercepted,
      }),
      { missilesLaunched: 0, missilesIntercepted: 0, dronesLaunched: 0, dronesIntercepted: 0 }
    );

    // Subcategory totals
    const ballisticRow = subcategoryRows.find((r) => r.subcategory === "ballistic");
    const cruiseRow    = subcategoryRows.find((r) => r.subcategory === "cruise");

    const kpi: KpiData = {
      ballisticLaunched:    Number(ballisticRow?.launched    ?? 0),
      ballisticIntercepted: Number(ballisticRow?.intercepted ?? 0),
      cruiseLaunched:       Number(cruiseRow?.launched       ?? 0),
      cruiseIntercepted:    Number(cruiseRow?.intercepted    ?? 0),
      totalMissilesLaunched:    totals.missilesLaunched,
      totalMissilesIntercepted: totals.missilesIntercepted,
      missileInterceptionRate:  pct(totals.missilesIntercepted, totals.missilesLaunched),
      totalDronesLaunched:    totals.dronesLaunched,
      totalDronesIntercepted: totals.dronesIntercepted,
      droneInterceptionRate:  pct(totals.dronesIntercepted, totals.dronesLaunched),
      lastUpdated: lastUpdatedResult?.ingestedAt.toISOString() ?? null,
    };

    return NextResponse.json({ kpi, daily } as AggregatesResponse);
  } catch (err) {
    console.error("[api/aggregates]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
