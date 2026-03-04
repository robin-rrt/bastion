"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { ThreatFilter } from "@/types";

const THREAT_OPTIONS: { value: ThreatFilter; label: string }[] = [
  { value: "ALL", label: "ALL" },
  { value: "MISSILE", label: "MISSILE" },
  { value: "DRONE", label: "DRONE" },
];

export function Filters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const threat = (searchParams.get("threat") as ThreatFilter) ?? "ALL";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-wrap items-center gap-3 py-3 px-0 border-b border-zinc-800">
      {/* Threat type filter */}
      <div className="flex gap-px">
        {THREAT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => update("threat", opt.value === "ALL" ? "" : opt.value)}
            className={`px-3 py-1 text-xs font-mono uppercase tracking-widest border transition-colors cursor-pointer ${
              threat === opt.value
                ? "bg-zinc-100 text-zinc-900 border-zinc-100"
                : "bg-transparent text-zinc-500 border-zinc-700 hover:border-zinc-500 hover:text-zinc-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Date range */}
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-xs font-mono text-zinc-600">FROM</span>
        <input
          type="date"
          value={from}
          onChange={(e) => update("from", e.target.value)}
          className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs font-mono px-2 py-1 focus:outline-none focus:border-zinc-500 [color-scheme:dark]"
        />
        <span className="text-xs font-mono text-zinc-600">TO</span>
        <input
          type="date"
          value={to}
          onChange={(e) => update("to", e.target.value)}
          className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs font-mono px-2 py-1 focus:outline-none focus:border-zinc-500 [color-scheme:dark]"
        />
        {(from || to) && (
          <button
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete("from");
              params.delete("to");
              router.push(`?${params.toString()}`);
            }}
            className="text-xs font-mono text-zinc-600 hover:text-zinc-400 cursor-pointer"
          >
            CLEAR
          </button>
        )}
      </div>
    </div>
  );
}
