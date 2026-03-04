import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClient } from "@/lib/claude";

export type SafetyLevel = "VERY SAFE" | "SAFE" | "CONCERNING" | "CRITICAL";

export interface SafetySummaryResponse {
  level: SafetyLevel;
  summary: string;
  stats: {
    overallInterceptionRate: number;
    totalImpacts: number;
    recentImpacts: number; // last 7 days
  };
  generatedAt: string;
}

function calcLevel(
  interceptionRate: number,
  totalImpacts: number,
  recentImpacts: number
): SafetyLevel {
  // Bias towards optimism — UAE has excellent layered air defence
  if (interceptionRate >= 0.85 && recentImpacts === 0) return "VERY SAFE";
  if (interceptionRate >= 0.65 && totalImpacts <= 2) return "SAFE";
  if (interceptionRate >= 0.45 || totalImpacts <= 5) return "CONCERNING";
  return "CRITICAL";
}

async function generateSummary(
  level: SafetyLevel,
  stats: { overallInterceptionRate: number; totalImpacts: number; recentImpacts: number },
  launched: number,
  intercepted: number
): Promise<string> {
  const pct = Math.round(stats.overallInterceptionRate * 100);

  const prompt = `You are a UAE public safety communications officer. Based on the following verified defence statistics, write a calm, factual 2-sentence safety assessment for UAE residents.

STATISTICS:
- Total projectiles launched: ${launched}
- Total intercepted by UAE air defence: ${intercepted} (${pct}% interception rate)
- Total that reached ground (impacts/debris): ${stats.totalImpacts}
- Impacts in the last 7 days: ${stats.recentImpacts}
- Current safety level: ${level}

TONE GUIDELINES:
- The UAE has one of the world's most advanced layered air defence systems. Reflect that.
- Be factual and reassuring. Do NOT be alarmist or create fear.
- If interception rate is high, highlight the effectiveness of air defences.
- If there have been ground impacts, acknowledge them briefly but contextualise with the overall interception success.
- End with a brief practical note (e.g. follow official channels, stay informed).
- Write in plain English. No bullet points. No headers. 2 sentences maximum.`;

  try {
    const msg = await getClient().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });
    return msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
  } catch {
    // Fallback static summary if API fails
    return `UAE air defence systems have successfully intercepted ${pct}% of incoming projectiles. Residents are advised to stay informed through official UAE government channels.`;
  }
}

export async function GET() {
  try {
    // Aggregate totals across all daily events
    const events = await db.event.findMany({
      select: {
        category: true,
        countLaunched: true,
        countIntercepted: true,
        countImpact: true,
        date: true,
      },
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let totalLaunched = 0;
    let totalIntercepted = 0;
    let totalImpacts = 0;
    let recentImpacts = 0;

    for (const e of events) {
      totalLaunched += e.countLaunched ?? 0;
      totalIntercepted += e.countIntercepted ?? 0;
      const impact = e.countImpact ?? 0;
      totalImpacts += impact;
      if (e.date >= sevenDaysAgo) recentImpacts += impact;
    }

    const overallInterceptionRate =
      totalLaunched > 0 ? totalIntercepted / totalLaunched : 1;

    const stats = { overallInterceptionRate, totalImpacts, recentImpacts };
    const level = calcLevel(overallInterceptionRate, totalImpacts, recentImpacts);
    const summary = await generateSummary(level, stats, totalLaunched, totalIntercepted);

    const response: SafetySummaryResponse = {
      level,
      summary,
      stats,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" },
    });
  } catch (err) {
    console.error("[api/safety-summary]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
