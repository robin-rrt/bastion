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
} from "recharts";
import type { DailyRow } from "@/types";

interface IncomingRow {
  date: string;
  missiles: number;
  drones: number;
  total: number;
}

function buildIncoming(daily: DailyRow[]): IncomingRow[] {
  return daily.map((row) => ({
    date: row.date,
    missiles: row.missilesLaunched,
    drones: row.dronesLaunched,
    total: row.missilesLaunched + row.dronesLaunched,
  }));
}

export function DailyIncomingChart({ data }: { data: DailyRow[] }) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-600 font-mono text-sm">
        NO DATA
      </div>
    );
  }

  const rows = buildIncoming(data);

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
          tick={{ fill: "#71717a", fontSize: 11, fontFamily: "monospace" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
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
        />
        <Legend
          wrapperStyle={{ fontFamily: "monospace", fontSize: 11, color: "#71717a" }}
        />
        <Line
          type="monotone"
          dataKey="total"
          name="Total incoming"
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: "#ef4444" }}
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
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
