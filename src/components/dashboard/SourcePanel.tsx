"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import type { TweetWithEvents } from "@/types";

function ConfidenceBar({ value }: { value: number | null }) {
  if (value === null) return null;
  const pct = Math.round(value * 100);
  const color =
    pct >= 80 ? "bg-green-600" : pct >= 50 ? "bg-yellow-500" : "bg-red-600";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-16 bg-zinc-800">
        <div className={`h-1 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-zinc-500">{pct}%</span>
    </div>
  );
}

function TweetCard({
  tweet,
  highlighted,
}: {
  tweet: TweetWithEvents;
  highlighted: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const categoryVariant = (cat: string) => {
    if (cat === "MISSILE") return "missile";
    if (cat === "DRONE") return "drone";
    return "other";
  };

  return (
    <div
      id={`tweet-${tweet.id}`}
      className={`border p-4 transition-colors ${
        highlighted
          ? "border-zinc-400 bg-zinc-800"
          : "border-zinc-800 bg-zinc-900"
      } ${tweet.needsReview ? "border-l-2 border-l-yellow-500" : ""}`}
    >
      {/* Header row */}
      <div className="flex flex-wrap items-start gap-2 mb-2">
        <span className="text-xs font-mono text-zinc-500">{tweet.tweetDate}</span>
        <span className="text-xs font-mono text-zinc-600">{tweet.author}</span>
        {tweet.needsReview && <Badge label="NEEDS REVIEW" variant="review" />}
        {tweet.events.map((e) => (
          <Badge key={e.id} label={e.category} variant={categoryVariant(e.category)} />
        ))}
        <ConfidenceBar value={tweet.confidence} />
        <a
          href={tweet.tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs font-mono text-zinc-600 hover:text-zinc-300 underline underline-offset-2"
        >
          VIEW SOURCE ↗
        </a>
      </div>

      {/* Tweet text */}
      <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap mb-3">
        {tweet.tweetText}
      </p>

      {/* Extracted events toggle */}
      {tweet.events.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-mono text-zinc-600 hover:text-zinc-400 cursor-pointer"
          >
            {expanded ? "▾" : "▸"} {tweet.events.length} EXTRACTED EVENT
            {tweet.events.length > 1 ? "S" : ""}
          </button>
          {expanded && (
            <div className="mt-2 space-y-1">
              {tweet.events.map((e) => (
                <div
                  key={e.id}
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1 text-xs font-mono border border-zinc-800 p-2"
                >
                  <span className="text-zinc-600">{e.date}</span>
                  <span className={e.category === "MISSILE" ? "text-amber-400" : e.category === "DRONE" ? "text-blue-400" : "text-violet-400"}>
                    {e.category}{e.subcategory ? ` / ${e.subcategory}` : ""}
                  </span>
                  {e.countLaunched != null && (
                    <span className="text-zinc-300">
                      fired: <strong>{e.countLaunched}</strong>
                    </span>
                  )}
                  {e.countIntercepted != null && (
                    <span className="text-zinc-300">
                      intercepted: <strong>{e.countIntercepted}</strong>
                    </span>
                  )}
                  {e.countImpact != null && (
                    <span className="text-red-400">
                      impact: <strong>{e.countImpact}</strong>
                    </span>
                  )}
                  {e.location && (
                    <span className="text-zinc-500">{e.location}</span>
                  )}
                  {e.interceptionSystem && (
                    <span className="text-zinc-500">{e.interceptionSystem}</span>
                  )}
                  {e.notes && (
                    <span className="col-span-full text-zinc-600 italic">
                      {e.notes}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SourcePanelProps {
  tweets: TweetWithEvents[];
  total: number;
  page: number;
  highlightId?: string | null;
  onPageChange?: (page: number) => void;
}

export function SourcePanel({
  tweets,
  total,
  page,
  highlightId,
  onPageChange,
}: SourcePanelProps) {
  const totalPages = Math.ceil(total / 20);

  if (tweets.length === 0) {
    return (
      <div className="border border-zinc-800 p-8 text-center">
        <p className="text-zinc-600 font-mono text-sm">
          NO SOURCE TWEETS. Use the ingestion script or API to add tweets.
        </p>
        <pre className="mt-4 text-xs text-zinc-700 text-left inline-block">
          {`pnpm tsx scripts/ingest.ts`}
        </pre>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-zinc-600">
          {total} SOURCE TWEET{total !== 1 ? "S" : ""}
        </span>
        {totalPages > 1 && (
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => onPageChange?.(p)}
                className={`text-xs font-mono px-2 py-0.5 border cursor-pointer ${
                  p === page
                    ? "bg-zinc-100 text-zinc-900 border-zinc-100"
                    : "text-zinc-600 border-zinc-700 hover:border-zinc-500"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-px">
        {tweets.map((tweet) => (
          <TweetCard
            key={tweet.id}
            tweet={tweet}
            highlighted={highlightId === tweet.id}
          />
        ))}
      </div>
    </div>
  );
}
