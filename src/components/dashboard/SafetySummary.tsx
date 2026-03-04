"use client";

import { useEffect, useState } from "react";
import type { SafetyLevel, SafetySummaryResponse } from "@/app/api/safety-summary/route";

const LEVEL_STYLES: Record<
  SafetyLevel,
  { badge: string; border: string; dot: string; label: string }
> = {
  "VERY SAFE": {
    badge: "text-emerald-400 bg-emerald-950 border-emerald-800",
    border: "border-emerald-900",
    dot: "bg-emerald-400",
    label: "VERY SAFE",
  },
  SAFE: {
    badge: "text-green-400 bg-green-950 border-green-800",
    border: "border-green-900",
    dot: "bg-green-400",
    label: "SAFE",
  },
  CONCERNING: {
    badge: "text-amber-400 bg-amber-950 border-amber-800",
    border: "border-amber-900",
    dot: "bg-amber-400",
    label: "CONCERNING",
  },
  CRITICAL: {
    badge: "text-red-400 bg-red-950 border-red-900",
    border: "border-red-900",
    dot: "bg-red-400",
    label: "CRITICAL",
  },
};

const INDEX_LEVELS: SafetyLevel[] = ["VERY SAFE", "SAFE", "CONCERNING", "CRITICAL"];

function SafetyIndex({ active }: { active: SafetyLevel }) {
  return (
    <div className="flex gap-px">
      {INDEX_LEVELS.map((lvl) => {
        const s = LEVEL_STYLES[lvl];
        const isActive = lvl === active;
        return (
          <div
            key={lvl}
            className={`px-2 py-0.5 text-xs font-mono border transition-opacity ${
              isActive
                ? `${s.badge} opacity-100 font-bold`
                : "text-zinc-700 bg-zinc-900 border-zinc-800 opacity-50"
            }`}
          >
            {lvl}
          </div>
        );
      })}
    </div>
  );
}

export function SafetySummary() {
  const [data, setData] = useState<SafetySummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/safety-summary")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="border border-zinc-800 bg-zinc-900 p-4">
        <div className="h-4 w-48 bg-zinc-800 animate-pulse" />
      </div>
    );
  }

  if (!data || "error" in data) return null;

  const styles = LEVEL_STYLES[data.level];
  const pct = Math.round(data.stats.overallInterceptionRate * 100);

  return (
    <div className={`border ${styles.border} bg-zinc-900 p-4 space-y-3`}>
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${styles.dot} animate-pulse`}
          />
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">
            Civilian Safety Assessment
          </span>
        </div>
        <SafetyIndex active={data.level} />
        <span className="ml-auto text-xs font-mono text-zinc-700 hidden sm:inline">
          {pct}% intercepted · {data.stats.totalImpacts} ground impact
          {data.stats.totalImpacts !== 1 ? "s" : ""} total
        </span>
      </div>

      {/* AI summary */}
      <p className="text-sm text-zinc-300 leading-relaxed font-sans">
        {data.summary}
      </p>

      <p className="text-xs font-mono text-zinc-700">
        AI-generated · based on verified MoD data · not official government advice
      </p>
    </div>
  );
}
