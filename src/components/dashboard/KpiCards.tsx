import { StatCard } from "@/components/ui/StatCard";
import type { KpiData } from "@/types";

export function KpiCards({ kpi }: { kpi: KpiData }) {
  return (
    <div className="space-y-px bg-zinc-800">
      {/* Missiles row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-zinc-800">
        <StatCard
          label="Ballistic Fired"
          value={kpi.ballisticLaunched}
          accent="amber"
        />
        <StatCard
          label="Ballistic Intercepted"
          value={kpi.ballisticIntercepted}
          accent="amber"
        />
        <StatCard
          label="Cruise Fired"
          value={kpi.cruiseLaunched}
          accent="amber"
        />
        <StatCard
          label="Cruise Intercepted"
          value={kpi.cruiseIntercepted}
          accent="amber"
        />
        <StatCard
          label="Missile Intercept %"
          value={`${kpi.missileInterceptionRate}%`}
          sub={`${kpi.totalMissilesLaunched} total fired`}
          accent="amber"
        />
      </div>

      {/* Drones row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-zinc-800">
        <StatCard
          label="Drones Fired"
          value={kpi.totalDronesLaunched}
          accent="blue"
        />
        <StatCard
          label="Drones Intercepted"
          value={kpi.totalDronesIntercepted}
          accent="blue"
        />
        <StatCard
          label="Drone Intercept %"
          value={`${kpi.droneInterceptionRate}%`}
          sub={`${kpi.totalDronesLaunched} total fired`}
          accent="blue"
        />
      </div>
    </div>
  );
}
