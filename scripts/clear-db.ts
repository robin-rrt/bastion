import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { db } from "@/lib/db";

async function main() {
  const events = await db.event.deleteMany();
  console.log(`Deleted ${events.count} event(s)`);

  const tweets = await db.rawTweet.deleteMany();
  console.log(`Deleted ${tweets.count} raw_tweet(s)`);

  await db.$disconnect();
  console.log("Done — DB is clean.");
}

main().catch((err) => { console.error(err); process.exit(1); });
