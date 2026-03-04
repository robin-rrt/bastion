"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import type { KpiData } from "@/types";

export function ThreatBreakdown({ kpi }: { kpi: KpiData }) {
  const data = [
    {
      name: "BALLISTIC",
      launched: kpi.ballisticLaunched,
      intercepted: kpi.ballisticIntercepted,
      color: "#f59e0b",
    },
    {
      name: "CRUISE",
      launched: kpi.cruiseLaunched,
      intercepted: kpi.cruiseIntercepted,
      color: "#fb923c",
    },
    {
      name: "DRONES",
      launched: kpi.totalDronesLaunched,
      intercepted: kpi.totalDronesIntercepted,
      color: "#3b82f6",
    },
  ];

  const hasData = data.some((d) => d.launched > 0);

  if (!hasData) {
    return (
      <div className="h-40 flex items-center justify-center text-zinc-600 font-mono text-sm">
        NO DATA
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: "#71717a", fontSize: 11, fontFamily: "monospace" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: "#71717a", fontSize: 11, fontFamily: "monospace" }}
          axisLine={false}
          tickLine={false}
          width={68}
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
          formatter={(value, name) => [value, name === "launched" ? "Fired" : "Intercepted"]}
        />
        <Bar dataKey="launched" name="launched" radius={0}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} fillOpacity={0.85} />
          ))}
        </Bar>
        <Bar dataKey="intercepted" name="intercepted" radius={0}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} fillOpacity={0.4} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
