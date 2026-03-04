#!/usr/bin/env tsx
/**
 * UAE Defence Dashboard — Manual Tweet Ingestion CLI
 * Usage: pnpm tsx scripts/ingest.ts
 *
 * Prompts for tweet metadata interactively, then calls the ingestion pipeline.
 */

import * as readline from "readline";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
import { ingestTweet } from "@/lib/ingest";
import { db } from "@/lib/db";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function readMultiline(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    console.log(prompt);
    console.log('  (enter "---" on a new line when done)\n');
    const lines: string[] = [];
    rl.on("line", function onLine(line) {
      if (line.trim() === "---") {
        rl.removeListener("line", onLine);
        resolve(lines.join("\n"));
      } else {
        lines.push(line);
      }
    });
  });
}

function colorize(confidence: number): string {
  if (confidence >= 0.8) return `\x1b[32m${confidence.toFixed(2)}\x1b[0m`; // green
  if (confidence >= 0.5) return `\x1b[33m${confidence.toFixed(2)}\x1b[0m`; // yellow
  return `\x1b[31m${confidence.toFixed(2)}\x1b[0m`; // red
}

async function main() {
  console.log("\n\x1b[1m═══ UAE Defence Dashboard — Tweet Ingestion ═══\x1b[0m\n");

  const tweetUrl = await ask("Tweet URL (x.com/...): ");
  const author = await ask("Author handle (e.g. @UAEMOD_en): ");
  const tweetDate = await ask("Tweet date (YYYY-MM-DD): ");
  const tweetText = await readMultiline("Paste tweet text:");

  if (!tweetUrl || !author || !tweetDate || !tweetText) {
    console.error("\x1b[31mError: all fields are required.\x1b[0m");
    process.exit(1);
  }

  // Basic date validation
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tweetDate)) {
    console.error("\x1b[31mError: date must be in YYYY-MM-DD format.\x1b[0m");
    process.exit(1);
  }

  console.log("\n\x1b[2mSending to Claude for classification...\x1b[0m");

  try {
    const result = await ingestTweet({ tweetUrl, tweetText, author, tweetDate });

    if (result.duplicate) {
      console.log(`\n\x1b[33m⚠ Duplicate: tweet already ingested (id: ${result.existingId})\x1b[0m`);
      process.exit(0);
    }

    const { extraction } = result;

    console.log(`\n\x1b[1m✓ Ingested\x1b[0m  id: ${result.rawTweetId}`);
    console.log(`  Relevant:   ${extraction.isRelevant ? "\x1b[32myes\x1b[0m" : "\x1b[90mno\x1b[0m"}`);
    console.log(`  Confidence: ${colorize(extraction.confidence)}`);
    console.log(`  Review:     ${extraction.needsReview ? "\x1b[33mflagged\x1b[0m" : "\x1b[32mok\x1b[0m"}`);

    if (extraction.events.length > 0) {
      console.log(`\n  Extracted ${extraction.events.length} event(s):`);
      extraction.events.forEach((e, i) => {
        console.log(`\n  [${i + 1}] ${e.category}${e.subcategory ? ` / ${e.subcategory}` : ""}`);
        if (e.countLaunched != null)    console.log(`      Launched:     ${e.countLaunched}`);
        if (e.countIntercepted != null) console.log(`      Intercepted:  ${e.countIntercepted}`);
        if (e.countImpact != null)      console.log(`      Impact:       ${e.countImpact}`);
        if (e.location)                 console.log(`      Location:     ${e.location}`);
        if (e.interceptionSystem)       console.log(`      System:       ${e.interceptionSystem}`);
        if (e.notes)                    console.log(`      Notes:        ${e.notes}`);
      });
    } else if (extraction.isRelevant) {
      console.log("\n  \x1b[33mWarning: relevant but no events extracted — check raw tweet.\x1b[0m");
    }

    console.log();
  } catch (err) {
    console.error("\x1b[31mIngestion failed:\x1b[0m", err);
    process.exit(1);
  } finally {
    rl.close();
    await db.$disconnect();
  }
}

main();
