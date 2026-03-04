import { NextRequest, NextResponse } from "next/server";
import { ingestTweet } from "@/lib/ingest";
import type { TweetInput } from "@/types";

export async function POST(req: NextRequest) {
  // Auth check
  const secret = req.headers.get("x-admin-secret");
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: TweetInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { tweetUrl, tweetText, author, tweetDate } = body;

  if (!tweetUrl || !tweetText || !author || !tweetDate) {
    return NextResponse.json(
      { error: "Missing required fields: tweetUrl, tweetText, author, tweetDate" },
      { status: 400 }
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(tweetDate)) {
    return NextResponse.json(
      { error: "tweetDate must be YYYY-MM-DD" },
      { status: 400 }
    );
  }

  try {
    const result = await ingestTweet({ tweetUrl, tweetText, author, tweetDate });

    if (result.duplicate) {
      return NextResponse.json(
        { error: "duplicate", existingId: result.existingId },
        { status: 409 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("[api/admin/ingest]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
