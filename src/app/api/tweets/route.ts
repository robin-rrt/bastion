import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { TweetsResponse, TweetWithEvents } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));
  const needsReview = searchParams.get("needsReview");
  const threat = searchParams.get("threat"); // MISSILE | DRONE | OTHER
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  try {
    const where = {
      ...(needsReview === "true" ? { needsReview: true } : {}),
      ...(from || to
        ? {
            tweetDate: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to + "T23:59:59Z") } : {}),
            },
          }
        : {}),
      ...(threat && threat !== "ALL"
        ? {
            events: {
              some: {
                category: threat as "MISSILE" | "DRONE" | "OTHER",
              },
            },
          }
        : {}),
    };

    const [total, rawTweets] = await Promise.all([
      db.rawTweet.count({ where }),
      db.rawTweet.findMany({
        where,
        orderBy: { tweetDate: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          events: {
            orderBy: { date: "asc" },
          },
        },
      }),
    ]);

    const tweets: TweetWithEvents[] = rawTweets.map((t) => ({
      id: t.id,
      tweetUrl: t.tweetUrl,
      tweetText: t.tweetText,
      author: t.author,
      tweetDate: t.tweetDate.toISOString().split("T")[0],
      ingestedAt: t.ingestedAt.toISOString(),
      isRelevant: t.isRelevant,
      confidence: t.confidence,
      needsReview: t.needsReview,
      events: t.events.map((e) => ({
        id: e.id,
        date: e.date.toISOString().split("T")[0],
        category: e.category,
        subcategory: e.subcategory,
        countLaunched: e.countLaunched,
        countIntercepted: e.countIntercepted,
        countImpact: e.countImpact,
        location: e.location,
        interceptionSystem: e.interceptionSystem,
        notes: e.notes,
      })),
    }));

    const response: TweetsResponse = { tweets, total, page };
    return NextResponse.json(response);
  } catch (err) {
    console.error("[api/tweets]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
