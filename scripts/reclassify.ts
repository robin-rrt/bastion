#!/usr/bin/env tsx
/**
 * Re-run Claude classification on ingested tweets.
 *
 * Usage:
 *   pnpm reclassify              # re-classify only needsReview / confidence=0 tweets
 *   pnpm reclassify --all        # re-classify EVERY tweet (e.g. after prompt update)
 *   pnpm reclassify <tweetId>    # re-classify a specific tweet by id
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { db } from "@/lib/db";
import { classifyAndExtract } from "@/lib/claude";

async function reclassify(id: string) {
  const tweet = await db.rawTweet.findUnique({
    where: { id },
    include: { events: true },
  });

  if (!tweet) {
    console.error(`  Not found: ${id}`);
    return;
  }

  console.log(`\nRe-classifying: ${id}`);
  console.log(`  URL: ${tweet.tweetUrl}`);

  const extraction = await classifyAndExtract(
    tweet.tweetText,
    tweet.tweetDate.toISOString().split("T")[0]
  );

  // Update raw tweet
  await db.rawTweet.update({
    where: { id },
    data: {
      isRelevant: extraction.isRelevant,
      confidence: extraction.confidence,
      needsReview: extraction.needsReview,
    },
  });

  // Delete old events and re-insert
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
  const confColor =
    conf >= 0.8 ? "\x1b[32m" : conf >= 0.5 ? "\x1b[33m" : "\x1b[31m";

  console.log(
    `  Relevant:   ${extraction.isRelevant ? "\x1b[32myes\x1b[0m" : "\x1b[90mno\x1b[0m"}`
  );
  console.log(`  Confidence: ${confColor}${conf.toFixed(2)}\x1b[0m`);
  console.log(
    `  Review:     ${extraction.needsReview ? "\x1b[33mflagged\x1b[0m" : "\x1b[32mok\x1b[0m"}`
  );
  console.log(`  Events:     ${extraction.events.length}`);
}

async function main() {
  const args = process.argv.slice(2);
  const allFlag = args.includes("--all");
  const specificId = args.find((a) => !a.startsWith("--"));

  if (specificId) {
    await reclassify(specificId);
  } else {
    const where = allFlag
      ? {} // every tweet
      : { OR: [{ confidence: 0 }, { needsReview: true }] };

    const tweets = await db.rawTweet.findMany({
      where,
      orderBy: { tweetDate: "asc" },
      select: { id: true },
    });

    console.log(
      `Found ${tweets.length} tweet(s) to re-classify${allFlag ? " (--all)" : ""}.`
    );
    for (const [i, t] of tweets.entries()) {
      process.stdout.write(`[${i + 1}/${tweets.length}] `);
      await reclassify(t.id);
    }
  }

  await db.$disconnect();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
