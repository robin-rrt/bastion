"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { KpiCards } from "./KpiCards";
import { DailyBarChart } from "./DailyBarChart";
import { CumulativeLineChart } from "./CumulativeLineChart";
import { DailyIncomingChart } from "./DailyIncomingChart";
import { DailyInterceptionRateChart } from "./DailyInterceptionRateChart";
import { ThreatBreakdown } from "./ThreatBreakdown";
import { SourcePanel } from "./SourcePanel";
import { Filters } from "./Filters";
import { SafetySummary } from "./SafetySummary";
import { LastUpdated } from "@/components/ui/LastUpdated";
import type { AggregatesResponse, TweetsResponse, ThreatFilter } from "@/types";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-600 border-b border-zinc-800 pb-2 mb-4">
      {children}
    </h2>
  );
}

export function Dashboard() {
  const searchParams = useSearchParams();
  const threat = (searchParams.get("threat") as ThreatFilter) ?? "ALL";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const [aggregates, setAggregates] = useState<AggregatesResponse | null>(null);
  const [tweetsData, setTweetsData] = useState<TweetsResponse | null>(null);
  const [tweetsPage, setTweetsPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAggregates = useCallback(async () => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (threat && threat !== "ALL") params.set("threat", threat);

    const res = await fetch(`/api/aggregates?${params}`);
    if (!res.ok) throw new Error("Failed to fetch aggregates");
    return res.json() as Promise<AggregatesResponse>;
  }, [from, to, threat]);

  const fetchTweets = useCallback(
    async (page: number) => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (threat && threat !== "ALL") params.set("threat", threat);

      const res = await fetch(`/api/tweets?${params}`);
      if (!res.ok) throw new Error("Failed to fetch tweets");
      return res.json() as Promise<TweetsResponse>;
    },
    [from, to, threat]
  );

  useEffect(() => {
    setLoading(true);
    setError(null);
    setTweetsPage(1);

    Promise.all([fetchAggregates(), fetchTweets(1)])
      .then(([agg, tweets]) => {
        setAggregates(agg);
        setTweetsData(tweets);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [fetchAggregates, fetchTweets]);

  const handlePageChange = async (page: number) => {
    setTweetsPage(page);
    const tweets = await fetchTweets(page);
    setTweetsData(tweets);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-600 font-mono text-sm">
        LOADING...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500 font-mono text-sm">
        ERROR: {error.toUpperCase()}
      </div>
    );
  }

  const kpi = aggregates!.kpi;
  const daily = aggregates!.daily;

  return (
    <div className="space-y-8">
      {/* Safety assessment banner */}
      <SafetySummary />

      {/* Filters */}
      <Filters />

      {/* KPI Cards */}
      <section>
        <SectionLabel>Overview</SectionLabel>
        <KpiCards kpi={kpi} />
      </section>

      {/* Data methodology note */}
      <p className="text-xs font-mono text-zinc-600 border-l-2 border-zinc-800 pl-3">
        NOTE: From 11 March 2026, UAE MoD reports engagements only — interception outcomes are no longer
        explicitly stated. Figures from this date assume all engagements were successful interceptions.
      </p>

      {/* Charts row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-zinc-800">
        <div className="col-span-2 bg-zinc-950 p-4">
          <SectionLabel>Daily Incidents</SectionLabel>
          <DailyBarChart data={daily} threatFilter={threat} />
        </div>
        <div className="bg-zinc-950 p-4">
          <SectionLabel>Threat Breakdown</SectionLabel>
          <ThreatBreakdown kpi={kpi} />
        </div>
      </section>

      {/* Daily incoming + interception rate */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-zinc-800">
        <div className="bg-zinc-950 p-4">
          <SectionLabel>Daily Incoming</SectionLabel>
          <DailyIncomingChart data={daily} />
        </div>
        <div className="bg-zinc-950 p-4">
          <SectionLabel>Daily Interception Rate</SectionLabel>
          <DailyInterceptionRateChart data={daily} />
        </div>
      </section>

      {/* Cumulative chart */}
      <section className="border border-zinc-800 bg-zinc-950 p-4">
        <SectionLabel>Cumulative Totals</SectionLabel>
        <CumulativeLineChart data={daily} />
      </section>

      {/* Source tweets */}
      <section>
        <SectionLabel>Source Verification — Tweet Log</SectionLabel>
        <SourcePanel
          tweets={tweetsData?.tweets ?? []}
          total={tweetsData?.total ?? 0}
          page={tweetsPage}
          onPageChange={handlePageChange}
        />
      </section>
    </div>
  );
}
