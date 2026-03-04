interface BadgeProps {
  label: string;
  variant?: "missile" | "drone" | "other" | "review" | "default";
}

const variantClass: Record<string, string> = {
  missile: "bg-amber-950 text-amber-400 border-amber-800",
  drone: "bg-blue-950 text-blue-400 border-blue-800",
  other: "bg-violet-950 text-violet-400 border-violet-800",
  review: "bg-yellow-950 text-yellow-400 border-yellow-700",
  default: "bg-zinc-800 text-zinc-400 border-zinc-700",
};

export function Badge({ label, variant = "default" }: BadgeProps) {
  return (
    <span
      className={`inline-block border px-1.5 py-0.5 text-xs font-mono uppercase tracking-wider ${variantClass[variant]}`}
    >
      {label}
    </span>
  );
}
