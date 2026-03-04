import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const category = searchParams.get("category"); // MISSILE | DRONE | OTHER
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50", 10));

  try {
    const where = {
      ...(category && category !== "ALL"
        ? { category: category as "MISSILE" | "DRONE" | "OTHER" }
        : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to + "T23:59:59Z") } : {}),
            },
          }
        : {}),
    };

    const [total, events] = await Promise.all([
      db.event.count({ where }),
      db.event.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          rawTweet: {
            select: {
              id: true,
              tweetUrl: true,
              author: true,
              tweetDate: true,
              needsReview: true,
              confidence: true,
            },
          },
        },
      }),
    ]);

    const serialized = events.map((e) => ({
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
      source: {
        id: e.rawTweet.id,
        tweetUrl: e.rawTweet.tweetUrl,
        author: e.rawTweet.author,
        tweetDate: e.rawTweet.tweetDate.toISOString().split("T")[0],
        needsReview: e.rawTweet.needsReview,
        confidence: e.rawTweet.confidence,
      },
    }));

    return NextResponse.json({ events: serialized, total, page });
  } catch (err) {
    console.error("[api/events]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
