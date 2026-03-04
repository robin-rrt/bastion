interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  accent?: "amber" | "blue" | "violet" | "white";
  flag?: "review" | "ok" | null;
}

const accentClass: Record<string, string> = {
  amber: "text-amber-400",
  blue: "text-blue-400",
  violet: "text-violet-400",
  white: "text-zinc-50",
};

export function StatCard({ label, value, sub, accent = "white", flag }: StatCardProps) {
  return (
    <div className="border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-1 min-w-0">
      <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">
        {label}
      </span>
      <span
        className={`text-3xl font-mono font-bold tabular-nums leading-none ${accentClass[accent]}`}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
      {sub && (
        <span className="text-xs font-mono text-zinc-400 tabular-nums">{sub}</span>
      )}
      {flag === "review" && (
        <span className="mt-1 text-xs font-mono text-amber-500">⚠ needs review</span>
      )}
    </div>
  );
}
