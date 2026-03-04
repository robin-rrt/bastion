"use client";

import { formatDistanceToNow } from "date-fns";

export function LastUpdated({ timestamp }: { timestamp: string | null }) {
  if (!timestamp) {
    return (
      <span className="text-xs font-mono text-zinc-600">
        NO DATA INGESTED
      </span>
    );
  }

  const date = new Date(timestamp);
  const relative = formatDistanceToNow(date, { addSuffix: true });
  const absolute = date.toUTCString();

  return (
    <span
      className="text-xs font-mono text-zinc-500 cursor-default"
      title={absolute}
    >
      UPDATED {relative.toUpperCase()}
    </span>
  );
}
