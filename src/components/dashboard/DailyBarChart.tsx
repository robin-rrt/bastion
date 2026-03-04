"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { DailyRow } from "@/types";

const COLORS = {
  missilesLaunched: "#f59e0b",
  missilesIntercepted: "#92400e",
  dronesLaunched: "#3b82f6",
  dronesIntercepted: "#1e3a8a",
};

interface Props {
  data: DailyRow[];
  threatFilter: "ALL" | "MISSILE" | "DRONE" | "OTHER";
}

export function DailyBarChart({ data, threatFilter }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-600 font-mono text-sm">
        NO DATA
      </div>
    );
  }

  const showMissiles = threatFilter === "ALL" || threatFilter === "MISSILE";
  const showDrones = threatFilter === "ALL" || threatFilter === "DRONE";

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
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
        {showMissiles && (
          <>
            <Bar
              dataKey="missilesLaunched"
              name="Missiles Fired"
              fill={COLORS.missilesLaunched}
              fillOpacity={0.9}
            />
            <Bar
              dataKey="missilesIntercepted"
              name="Missiles Intercepted"
              fill={COLORS.missilesIntercepted}
              fillOpacity={0.9}
            />
          </>
        )}
        {showDrones && (
          <>
            <Bar
              dataKey="dronesLaunched"
              name="Drones Fired"
              fill={COLORS.dronesLaunched}
              fillOpacity={0.9}
            />
            <Bar
              dataKey="dronesIntercepted"
              name="Drones Intercepted"
              fill={COLORS.dronesIntercepted}
              fillOpacity={0.9}
            />
          </>
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
