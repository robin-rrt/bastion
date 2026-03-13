"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { DailyRow } from "@/types";

interface RateRow {
  date: string;
  missiles: number | null;
  drones: number | null;
  overall: number | null;
}

function rate(intercepted: number, launched: number): number | null {
  if (launched === 0) return null;
  return Math.round((intercepted / launched) * 1000) / 10; // one decimal %
}

function buildRates(daily: DailyRow[]): RateRow[] {
  return daily.map((row) => ({
    date: row.date,
    missiles: rate(row.missilesIntercepted, row.missilesLaunched),
    drones: rate(row.dronesIntercepted, row.dronesLaunched),
    overall: rate(
      row.missilesIntercepted + row.dronesIntercepted,
      row.missilesLaunched + row.dronesLaunched
    ),
  }));
}

function formatPct(value: number) {
  return `${value}%`;
}

export function DailyInterceptionRateChart({ data }: { data: DailyRow[] }) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-600 font-mono text-sm">
        NO DATA
      </div>
    );
  }

  const rows = buildRates(data);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "#71717a", fontSize: 11, fontFamily: "monospace" }}
          axisLine={{ stroke: "#27272a" }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={formatPct}
          tick={{ fill: "#71717a", fontSize: 11, fontFamily: "monospace" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "#18181b",
            border: "1px solid #27272a",
            borderRadius: 0,
            fontFamily: "monospace",
            fontSize: 12,
          }}
          labelStyle={{ color: "#fafafa" }}
          itemStyle={{ color: "#a1a1aa" }}
          formatter={(value: number) => [`${value}%`]}
        />
        <Legend
          wrapperStyle={{ fontFamily: "monospace", fontSize: 11, color: "#71717a" }}
        />
        <ReferenceLine y={100} stroke="#27272a" strokeDasharray="2 4" />
        <Line
          type="monotone"
          dataKey="overall"
          name="Overall"
          stroke="#22c55e"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: "#22c55e" }}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="missiles"
          name="Missiles"
          stroke="#f59e0b"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          dot={false}
          activeDot={{ r: 3, fill: "#f59e0b" }}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="drones"
          name="Drones"
          stroke="#3b82f6"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          dot={false}
          activeDot={{ r: 3, fill: "#3b82f6" }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
