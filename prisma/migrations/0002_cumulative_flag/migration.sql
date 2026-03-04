-- Add isCumulative column to events table
-- false (default) = daily incident count; true = running total since conflict start
ALTER TABLE "events" ADD COLUMN "isCumulative" BOOLEAN NOT NULL DEFAULT false;

-- Rebuild daily_aggregates VIEW to exclude cumulative events from daily sums
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
WHERE e."isCumulative" = false
GROUP BY DATE_TRUNC('day', e.date)::date
ORDER BY date;
