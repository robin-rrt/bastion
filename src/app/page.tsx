import { Suspense } from "react";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { LastUpdated } from "@/components/ui/LastUpdated";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getLastUpdated(): Promise<string | null> {
  try {
    const row = await db.rawTweet.findFirst({
      orderBy: { ingestedAt: "desc" },
      select: { ingestedAt: true },
    });
    return row?.ingestedAt.toISOString() ?? null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const lastUpdated = await getLastUpdated();

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-sm font-mono font-bold uppercase tracking-widest text-zinc-100">
              Bastion
            </h1>
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-600">
              Unofficial Realtime UAE Defence Dashboard
            </span>
            <span className="hidden sm:inline text-xs font-mono text-zinc-700">
              / Iranian Attack Statistics
            </span>
          </div>
          <LastUpdated timestamp={lastUpdated} />
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-64 text-zinc-600 font-mono text-sm">
              LOADING...
            </div>
          }
        >
          <Dashboard />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-16">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <span className="text-xs font-mono text-zinc-700">
            Source: UAE Ministry of Defence (@UAEMOD_en)
          </span>
          <span className="text-xs font-mono text-zinc-700">
            Stats derived via Claude AI extraction — verify against source tweets
          </span>
        </div>
      </footer>
    </div>
  );
}
