import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { PrismaClient } from "@/generated/prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const db = new PrismaClient().$extends(withAccelerate());
db.rawTweet.count()
  .then((n) => { console.log("Connected! Tweets in DB:", n); process.exit(0); })
  .catch((e: Error) => { console.error("Failed:", e.message); process.exit(1); });
