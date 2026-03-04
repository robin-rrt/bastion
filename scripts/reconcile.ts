#!/usr/bin/env tsx
/**
 * Reconciliation tool — compare DB running totals against authoritative
 * cumulative figures from a UAE MoD tweet and optionally apply corrections.
 *
 * Usage:
 *   pnpm reconcile
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import * as readline from "readline";
import { db } from "@/lib/db";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";

function ask(rl: readline.Interface, q: string): Promise<string> {
  return new Promise((r) => rl.question(q, r));
}

async function askInt(rl: readline.Interface, q: string): Promise<number | null> {
  const raw = (await ask(rl, q)).trim();
  if (raw === "" || raw === "-") return null;
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}

interface CategoryTotals {
  launched: number;
  intercepted: number;
  impact: number;
}

async function getDbTotals(): Promise<Record<string, CategoryTotals>> {
  const events = await db.event.findMany({
    select: { category: true, subcategory: true, countLaunched: true, countIntercepted: true, countImpact: true },
  });

  const totals: Record<string, CategoryTotals> = {};
  for (const e of events) {
    const key = e.subcategory ? `${e.category}/${e.subcategory}` : e.category;
    if (!totals[key]) totals[key] = { launched: 0, intercepted: 0, impact: 0 };
    totals[key].launched += e.countLaunched ?? 0;
    totals[key].intercepted += e.countIntercepted ?? 0;
    totals[key].impact += e.countImpact ?? 0;
  }
  return totals;
}

function diffColor(diff: number): string {
  if (diff === 0) return GREEN + "  0 ✓" + RESET;
  return (diff > 0 ? GREEN : RED) + `${diff > 0 ? "+" : ""}${diff}` + RESET;
}

function row(label: string, db: number, stated: number | null) {
  if (stated === null) return `  ${DIM}${label.padEnd(28)} (skipped)${RESET}`;
  const diff = stated - db;
  return `  ${label.padEnd(28)} DB: ${CYAN}${String(db).padStart(5)}${RESET}  Stated: ${CYAN}${String(stated).padStart(5)}${RESET}  Diff: ${diffColor(diff)}`;
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log(`\n${BOLD}╔══════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}║  UAE DEFENCE DASHBOARD — RECONCILIATION TOOL                         ║${RESET}`);
  console.log(`${BOLD}╚══════════════════════════════════════════════════════════════════════╝${RESET}`);
  console.log(`  Enter cumulative totals from an authoritative MoD tweet.`);
  console.log(`  ${DIM}Press Enter to skip a field. Numbers only — sea-falls excluded from impact.${RESET}\n`);

  const tweetDate = (await ask(rl, "  Tweet date (YYYY-MM-DD): ")).trim();
  const tweetUrl  = (await ask(rl, "  Tweet URL (for reference): ")).trim();
  console.log();

  console.log(`  ${BOLD}Ballistic missiles:${RESET}`);
  const balLaunched     = await askInt(rl, "    Launched:     ");
  const balIntercepted  = await askInt(rl, "    Intercepted:  ");
  const balImpact       = await askInt(rl, "    Impact (territory, not sea): ");

  console.log(`\n  ${BOLD}Cruise missiles:${RESET}`);
  const crsLaunched     = await askInt(rl, "    Launched:     ");
  const crsIntercepted  = await askInt(rl, "    Intercepted:  ");
  const crsImpact       = await askInt(rl, "    Impact:       ");

  console.log(`\n  ${BOLD}Drones:${RESET}`);
  const drnLaunched     = await askInt(rl, "    Launched:     ");
  const drnIntercepted  = await askInt(rl, "    Intercepted:  ");
  const drnImpact       = await askInt(rl, "    Impact (territory, not sea): ");

  // ── Fetch current DB totals ──
  const db_ = await getDbTotals();
  const bal = db_["MISSILE/ballistic"] ?? { launched: 0, intercepted: 0, impact: 0 };
  const crs = db_["MISSILE/cruise"]    ?? { launched: 0, intercepted: 0, impact: 0 };
  const drn = db_["DRONE/UAV"]         ?? { launched: 0, intercepted: 0, impact: 0 };

  // ── Show comparison ──
  console.log(`\n${"─".repeat(72)}`);
  console.log(`${BOLD}RECONCILIATION REPORT${RESET}  ${DIM}vs. tweet ${tweetDate}${RESET}\n`);

  console.log(`  ${BOLD}Ballistic missiles${RESET}`);
  console.log(row("  launched",    bal.launched,    balLaunched));
  console.log(row("  intercepted", bal.intercepted, balIntercepted));
  console.log(row("  impact",      bal.impact,      balImpact));

  console.log(`\n  ${BOLD}Cruise missiles${RESET}`);
  console.log(row("  launched",    crs.launched,    crsLaunched));
  console.log(row("  intercepted", crs.intercepted, crsIntercepted));
  console.log(row("  impact",      crs.impact,      crsImpact));

  console.log(`\n  ${BOLD}Drones${RESET}`);
  console.log(row("  launched",    drn.launched,    drnLaunched));
  console.log(row("  intercepted", drn.intercepted, drnIntercepted));
  console.log(row("  impact",      drn.impact,      drnImpact));

  // ── Check if there are any discrepancies ──
  const diffs: Array<{ cat: string; sub: string; field: string; diff: number }> = [];
  const check = (cat: string, sub: string | null, field: "launched" | "intercepted" | "impact", stated: number | null, actual: number) => {
    if (stated !== null && stated !== actual) {
      diffs.push({ cat, sub: sub ?? "", field, diff: stated - actual });
    }
  };
  check("MISSILE", "ballistic", "launched",    balLaunched,    bal.launched);
  check("MISSILE", "ballistic", "intercepted", balIntercepted, bal.intercepted);
  check("MISSILE", "ballistic", "impact",      balImpact,      bal.impact);
  check("MISSILE", "cruise",    "launched",    crsLaunched,    crs.launched);
  check("MISSILE", "cruise",    "intercepted", crsIntercepted, crs.intercepted);
  check("MISSILE", "cruise",    "impact",      crsImpact,      crs.impact);
  check("DRONE",   "UAV",       "launched",    drnLaunched,    drn.launched);
  check("DRONE",   "UAV",       "intercepted", drnIntercepted, drn.intercepted);
  check("DRONE",   "UAV",       "impact",      drnImpact,      drn.impact);

  if (diffs.length === 0) {
    console.log(`\n  ${GREEN}${BOLD}✓ All totals match — no discrepancies.${RESET}\n`);
    rl.close();
    await db.$disconnect();
    return;
  }

  console.log(`\n  ${YELLOW}${BOLD}⚠  ${diffs.length} discrepancy(ies) detected.${RESET}`);
  for (const d of diffs) {
    const dir = d.diff > 0 ? `DB is missing ${d.diff}` : `DB has ${Math.abs(d.diff)} too many`;
    console.log(`  ${DIM}  ${d.cat}/${d.sub} ${d.field}: ${dir}${RESET}`);
  }

  console.log();
  const apply = (await ask(rl, "  Apply correction events to reconcile? [y/N] ")).trim().toLowerCase();

  if (apply !== "y") {
    console.log("  No changes made.\n");
    rl.close();
    await db.$disconnect();
    return;
  }

  // ── Create a correction rawTweet record ──
  const correctionUrl = `correction:reconcile:${tweetDate}:${Date.now()}`;
  const corrTweet = await db.rawTweet.create({
    data: {
      tweetUrl:  correctionUrl,
      tweetText: `Manual reconciliation against MoD tweet ${tweetUrl} (${tweetDate}). Correction events inserted to align DB totals with authoritative cumulative figures.`,
      author:    "admin-reconcile",
      tweetDate: new Date(tweetDate),
      isRelevant: true,
      confidence: 1.0,
      needsReview: false,
    },
  });

  // Build correction events — one per category with the delta
  const corrections: Array<{
    rawTweetId: string;
    date: Date;
    category: "MISSILE" | "DRONE" | "OTHER";
    subcategory: string | null;
    countLaunched: number | null;
    countIntercepted: number | null;
    countImpact: number | null;
    notes: string;
  }> = [];

  const buildNote = (cat: string, sub: string, statedL: number | null, statedI: number | null, statedImpact: number | null, actual: CategoryTotals) => {
    return `Reconciliation correction vs MoD tweet ${tweetDate} (${tweetUrl}). ` +
      `Stated cumulative: launched=${statedL ?? "—"} intercepted=${statedI ?? "—"} impact=${statedImpact ?? "—"}. ` +
      `DB was: launched=${actual.launched} intercepted=${actual.intercepted} impact=${actual.impact}.`;
  };

  // Only create correction events where we have a stated value AND a discrepancy
  if (
    (balLaunched !== null && balLaunched !== bal.launched) ||
    (balIntercepted !== null && balIntercepted !== bal.intercepted) ||
    (balImpact !== null && balImpact !== bal.impact)
  ) {
    corrections.push({
      rawTweetId:      corrTweet.id,
      date:            new Date(tweetDate),
      category:        "MISSILE",
      subcategory:     "ballistic",
      countLaunched:   balLaunched !== null ? balLaunched - bal.launched : null,
      countIntercepted: balIntercepted !== null ? balIntercepted - bal.intercepted : null,
      countImpact:     balImpact !== null ? balImpact - bal.impact : null,
      notes: buildNote("MISSILE", "ballistic", balLaunched, balIntercepted, balImpact, bal),
    });
  }

  if (
    (crsLaunched !== null && crsLaunched !== crs.launched) ||
    (crsIntercepted !== null && crsIntercepted !== crs.intercepted) ||
    (crsImpact !== null && crsImpact !== crs.impact)
  ) {
    corrections.push({
      rawTweetId:      corrTweet.id,
      date:            new Date(tweetDate),
      category:        "MISSILE",
      subcategory:     "cruise",
      countLaunched:   crsLaunched !== null ? crsLaunched - crs.launched : null,
      countIntercepted: crsIntercepted !== null ? crsIntercepted - crs.intercepted : null,
      countImpact:     crsImpact !== null ? crsImpact - crs.impact : null,
      notes: buildNote("MISSILE", "cruise", crsLaunched, crsIntercepted, crsImpact, crs),
    });
  }

  if (
    (drnLaunched !== null && drnLaunched !== drn.launched) ||
    (drnIntercepted !== null && drnIntercepted !== drn.intercepted) ||
    (drnImpact !== null && drnImpact !== drn.impact)
  ) {
    corrections.push({
      rawTweetId:      corrTweet.id,
      date:            new Date(tweetDate),
      category:        "DRONE",
      subcategory:     "UAV",
      countLaunched:   drnLaunched !== null ? drnLaunched - drn.launched : null,
      countIntercepted: drnIntercepted !== null ? drnIntercepted - drn.intercepted : null,
      countImpact:     drnImpact !== null ? drnImpact - drn.impact : null,
      notes: buildNote("DRONE", "UAV", drnLaunched, drnIntercepted, drnImpact, drn),
    });
  }

  await db.event.createMany({ data: corrections });

  // ── Verify new totals ──
  const after = await getDbTotals();
  const balA = after["MISSILE/ballistic"] ?? { launched: 0, intercepted: 0, impact: 0 };
  const crsA = after["MISSILE/cruise"]    ?? { launched: 0, intercepted: 0, impact: 0 };
  const drnA = after["DRONE/UAV"]         ?? { launched: 0, intercepted: 0, impact: 0 };

  console.log(`\n  ${GREEN}Correction events applied. New totals:${RESET}`);
  console.log(`  MISSILE/ballistic  launched=${balA.launched}  intercepted=${balA.intercepted}  impact=${balA.impact}`);
  console.log(`  MISSILE/cruise     launched=${crsA.launched}  intercepted=${crsA.intercepted}  impact=${crsA.impact}`);
  console.log(`  DRONE/UAV          launched=${drnA.launched}  intercepted=${drnA.intercepted}  impact=${drnA.impact}`);
  console.log();

  rl.close();
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
