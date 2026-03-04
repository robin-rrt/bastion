#!/usr/bin/env tsx
/**
 * Interactive audit tool — review all ingested tweets and their extracted events.
 *
 * Usage:
 *   pnpm review                   # review all tweets
 *   pnpm review --needs-review    # only flagged tweets
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import * as readline from "readline";
import { db } from "@/lib/db";
import { classifyAndExtract } from "@/lib/claude";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const WHITE = "\x1b[37m";

function line(char = "─", width = 72) {
  return DIM + char.repeat(width) + RESET;
}

function formatEvent(e: {
  category: string;
  subcategory: string | null;
  countLaunched: number | null;
  countIntercepted: number | null;
  countImpact: number | null;
  location: string | null;
  interceptionSystem: string | null;
  notes: string | null;
}) {
  const parts = [
    `${BOLD}${e.category}${RESET}${e.subcategory ? ` (${e.subcategory})` : ""}`,
  ];
  if (e.countLaunched != null) parts.push(`launched: ${CYAN}${e.countLaunched}${RESET}`);
  if (e.countIntercepted != null)
    parts.push(`intercepted: ${GREEN}${e.countIntercepted}${RESET}`);
  if (e.countImpact != null) parts.push(`impact: ${RED}${e.countImpact}${RESET}`);
  if (e.location) parts.push(`loc: ${e.location}`);
  if (e.interceptionSystem) parts.push(`system: ${e.interceptionSystem}`);
  if (e.notes) parts.push(`\n    ${DIM}note: ${e.notes}${RESET}`);
  return "  · " + parts.join("  ·  ");
}

async function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function rerunClaude(id: string) {
  const tweet = await db.rawTweet.findUnique({ where: { id } });
  if (!tweet) return;

  process.stdout.write("  Re-running Claude...");
  const extraction = await classifyAndExtract(
    tweet.tweetText,
    tweet.tweetDate.toISOString().split("T")[0]
  );

  await db.rawTweet.update({
    where: { id },
    data: {
      isRelevant: extraction.isRelevant,
      confidence: extraction.confidence,
      needsReview: extraction.needsReview,
    },
  });

  await db.event.deleteMany({ where: { rawTweetId: id } });

  if (extraction.isRelevant && extraction.events.length > 0) {
    await db.event.createMany({
      data: extraction.events.map((e) => ({
        rawTweetId: id,
        date: new Date(e.date),
        category: e.category,
        subcategory: e.subcategory ?? null,
        countLaunched: e.countLaunched ?? null,
        countIntercepted: e.countIntercepted ?? null,
        countImpact: e.countImpact ?? null,
        location: e.location ?? null,
        interceptionSystem: e.interceptionSystem ?? null,
        notes: e.notes ?? null,
      })),
    });
  }

  const conf = extraction.confidence;
  const confColor = conf >= 0.8 ? GREEN : conf >= 0.5 ? YELLOW : RED;
  console.log(
    ` done  confidence: ${confColor}${conf.toFixed(2)}${RESET}  events: ${extraction.events.length}  review: ${extraction.needsReview ? YELLOW + "flagged" + RESET : GREEN + "ok" + RESET}`
  );

  const fresh = await db.event.findMany({ where: { rawTweetId: id } });
  if (fresh.length > 0) {
    console.log(`  ${DIM}New extraction:${RESET}`);
    for (const ev of fresh) console.log(formatEvent(ev));
  }
}

async function deleteEvents(id: string) {
  const deleted = await db.event.deleteMany({ where: { rawTweetId: id } });
  await db.rawTweet.update({
    where: { id },
    data: { isRelevant: false, needsReview: true },
  });
  console.log(`  Deleted ${deleted.count} event(s) — tweet marked needsReview.`);
}

async function main() {
  const args = process.argv.slice(2);
  const onlyNeedsReview = args.includes("--needs-review");

  const where = onlyNeedsReview ? { needsReview: true as const } : {};

  const tweets = await db.rawTweet.findMany({
    where,
    include: { events: { orderBy: { date: "asc" } } },
    orderBy: { tweetDate: "asc" },
  });

  if (tweets.length === 0) {
    console.log("No tweets to audit.");
    await db.$disconnect();
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log(
    `\n${BOLD}╔══════════════════════════════════════════════════════════════════════╗${RESET}`
  );
  console.log(
    `${BOLD}║  UAE DEFENCE DASHBOARD — REVIEW TOOL                                ║${RESET}`
  );
  console.log(
    `${BOLD}╚══════════════════════════════════════════════════════════════════════╝${RESET}`
  );
  console.log(`  ${tweets.length} tweet(s) to review\n`);

  for (let i = 0; i < tweets.length; i++) {
    const t = tweets[i];
    const dateStr = t.tweetDate.toISOString().split("T")[0];
    const conf = t.confidence ?? 0;
    const confColor = conf >= 0.8 ? GREEN : conf >= 0.5 ? YELLOW : RED;

    console.log(line());
    console.log(
      `${BOLD}[${i + 1}/${tweets.length}]${RESET}  ${CYAN}${t.id}${RESET}  ${DIM}${dateStr}${RESET}  @${t.author}`
    );
    console.log(
      `  ${DIM}${t.tweetUrl}${RESET}  conf: ${confColor}${conf.toFixed(2)}${RESET}  ${t.needsReview ? YELLOW + "⚠ needsReview" + RESET : ""}`
    );
    console.log();

    // Tweet text wrapped at 72 chars
    const words = t.tweetText.split(" ");
    let lineBuffer = "  ";
    for (const w of words) {
      if ((lineBuffer + w).length > 72) {
        console.log(WHITE + lineBuffer + RESET);
        lineBuffer = "  " + w + " ";
      } else {
        lineBuffer += w + " ";
      }
    }
    if (lineBuffer.trim()) console.log(WHITE + lineBuffer + RESET);
    console.log();

    if (t.events.length === 0) {
      console.log(`  ${DIM}No events extracted.${RESET}`);
    } else {
      console.log(`  ${BOLD}Extracted events (${t.events.length}):${RESET}`);
      for (const ev of t.events) console.log(formatEvent(ev));
    }

    console.log();
    console.log(
      `  ${DIM}[Enter] Skip  [r] Re-run Claude  [d] Delete events  [q] Quit${RESET}`
    );

    const answer = (await askQuestion(rl, "  > ")).trim().toLowerCase();

    if (answer === "q") {
      console.log("\nReview stopped.");
      break;
    } else if (answer === "r") {
      await rerunClaude(t.id);
    } else if (answer === "d") {
      await deleteEvents(t.id);
    }

    console.log();
  }

  rl.close();
  await db.$disconnect();
  console.log("Review complete.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
