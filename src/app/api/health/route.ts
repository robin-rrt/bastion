import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const checks: Record<string, string> = {};

  // Check env var presence (never reveal the value)
  checks.POSTGRES_URL = process.env.POSTGRES_URL ? "set" : "MISSING";
  checks.NODE_ENV = process.env.NODE_ENV ?? "undefined";

  try {
    // Try a minimal DB query
    await db.$queryRaw`SELECT 1`;
    checks.db = "ok";
  } catch (err: unknown) {
    checks.db = err instanceof Error ? err.message : String(err);
  }

  const ok = checks.POSTGRES_URL === "set" && checks.db === "ok";
  return NextResponse.json(checks, { status: ok ? 200 : 500 });
}
