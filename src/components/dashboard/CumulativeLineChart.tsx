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
import type { CumulativeCheckpoint, DailyRow } from "@/types";

interface CumulativeRow {
  date: string;
  missiles: number;
  drones: number;
  intercepted: number;
  isCheckpoint?: boolean;
}

function buildFromCheckpoints(checkpoints: CumulativeCheckpoint[]): CumulativeRow[] {
  return checkpoints.map((cp) => ({
    date: cp.date,
    missiles: cp.missiles,
    drones: cp.drones,
    intercepted: cp.missiles + cp.drones + cp.other,
    isCheckpoint: true,
  }));
}

function buildFromDaily(daily: DailyRow[]): CumulativeRow[] {
  let missiles = 0;
  let drones = 0;
  let intercepted = 0;
  return daily.map((row) => {
    missiles += row.missilesLaunched;
    drones += row.dronesLaunched;
    intercepted += row.missilesIntercepted + row.dronesIntercepted;
    return { date: row.date, missiles, drones, intercepted };
  });
}

export function CumulativeLineChart({
  data,
  checkpoints = [],
}: {
  data: DailyRow[];
  checkpoints?: CumulativeCheckpoint[];
}) {
  if (data.length === 0 && checkpoints.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-600 font-mono text-sm">
        NO DATA
      </div>
    );
  }

  const usingCheckpoints = checkpoints.length > 0;
  const cumulative = usingCheckpoints
    ? buildFromCheckpoints(checkpoints)
    : buildFromDaily(data);

  return (
    <div>
      {usingCheckpoints && (
        <p className="text-xs font-mono text-zinc-600 mb-2">
          AUTHORITATIVE — sourced from official cumulative statements
        </p>
      )}
    <ResponsiveContainer width="100%" height={280}>
      <LineChart
        data={cumulative}
        margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
      >
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
          dataKey="missiles"
          name="Missiles (cumulative)"
          stroke="#f59e0b"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, fill: "#f59e0b" }}
        />
        <Line
          type="monotone"
          dataKey="drones"
          name="Drones (cumulative)"
          stroke="#3b82f6"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, fill: "#3b82f6" }}
        />
        <Line
          type="monotone"
          dataKey="intercepted"
          name="Intercepted total (cumulative)"
          stroke="#22c55e"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          dot={false}
          activeDot={{ r: 3, fill: "#22c55e" }}
        />
      </LineChart>
    </ResponsiveContainer>
    </div>
  );
}
