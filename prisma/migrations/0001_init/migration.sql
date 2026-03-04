-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('MISSILE', 'DRONE', 'OTHER');

-- CreateTable
CREATE TABLE "raw_tweets" (
    "id" TEXT NOT NULL,
    "tweetUrl" TEXT NOT NULL,
    "tweetText" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "tweetDate" TIMESTAMP(3) NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRelevant" BOOLEAN,
    "confidence" DOUBLE PRECISION,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "raw_tweets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "rawTweetId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" "EventCategory" NOT NULL,
    "subcategory" TEXT,
    "countLaunched" INTEGER,
    "countIntercepted" INTEGER,
    "countImpact" INTEGER,
    "location" TEXT,
    "interceptionSystem" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "raw_tweets_tweetUrl_key" ON "raw_tweets"("tweetUrl");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_rawTweetId_fkey" FOREIGN KEY ("rawTweetId") REFERENCES "raw_tweets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateView: daily_aggregates
CREATE OR REPLACE VIEW daily_aggregates AS
SELECT
    DATE_TRUNC('day', e.date)::date AS date,
    SUM(CASE WHEN e.category = 'MISSILE' THEN COALESCE(e."countLaunched", 0)    ELSE 0 END) AS missiles_launched,
    SUM(CASE WHEN e.category = 'MISSILE' THEN COALESCE(e."countIntercepted", 0) ELSE 0 END) AS missiles_intercepted,
    SUM(CASE WHEN e.category = 'DRONE'   THEN COALESCE(e."countLaunched", 0)    ELSE 0 END) AS drones_launched,
    SUM(CASE WHEN e.category = 'DRONE'   THEN COALESCE(e."countIntercepted", 0) ELSE 0 END) AS drones_intercepted,
    SUM(CASE WHEN e.category = 'OTHER'   THEN COALESCE(e."countLaunched", 0)    ELSE 0 END) AS other_launched,
    SUM(CASE WHEN e.category = 'OTHER'   THEN COALESCE(e."countIntercepted", 0) ELSE 0 END) AS other_intercepted
FROM events e
GROUP BY DATE_TRUNC('day', e.date)::date
ORDER BY date;
