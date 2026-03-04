import { db } from "@/lib/db";
import { classifyAndExtract } from "@/lib/claude";
import type {
  TweetInput,
  IngestResult,
  DuplicateResult,
} from "@/types";

export class DuplicateError extends Error {
  constructor(public existingId: string) {
    super(`Tweet already ingested (id: ${existingId})`);
    this.name = "DuplicateError";
  }
}

export async function ingestTweet(
  input: TweetInput
): Promise<IngestResult | DuplicateResult> {
  // 1. Dedup check
  const existing = await db.rawTweet.findUnique({
    where: { tweetUrl: input.tweetUrl },
    select: { id: true },
  });

  if (existing) {
    return { duplicate: true, existingId: existing.id };
  }

  // 2. Create raw tweet record (isRelevant=null = pending classification)
  const raw = await db.rawTweet.create({
    data: {
      tweetUrl: input.tweetUrl,
      tweetText: input.tweetText,
      author: input.author,
      tweetDate: new Date(input.tweetDate),
    },
  });

  // 3. Call Claude for classification + extraction
  const extraction = await classifyAndExtract(
    input.tweetText,
    input.tweetDate
  );

  // 4. Update raw tweet with classification metadata
  await db.rawTweet.update({
    where: { id: raw.id },
    data: {
      isRelevant: extraction.isRelevant,
      confidence: extraction.confidence,
      needsReview: extraction.needsReview,
    },
  });

  // 5. If relevant, insert extracted event rows
  if (extraction.isRelevant && extraction.events.length > 0) {
    await db.event.createMany({
      data: extraction.events.map((e) => ({
        rawTweetId: raw.id,
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

  return { rawTweetId: raw.id, extraction, duplicate: false };
}
