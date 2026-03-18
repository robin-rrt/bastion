import Anthropic from "@anthropic-ai/sdk";
import type { ClaudeExtractionResult } from "@/types";

// Client is created on first use so that env vars (dotenv) are loaded first
// when running from CLI scripts where imports are hoisted before dotenv.config()
let _client: Anthropic | null = null;
export function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

const SYSTEM_PROMPT = `You are a military data extraction specialist. Your only job is to parse verified UAE Ministry of Defence statements and extract structured numerical data from them. The authenticity and relevance of every statement has already been confirmed by a human operator before it reaches you — do not second-guess or re-evaluate that. You handle both Arabic and English text with equal accuracy. You always respond with valid JSON and nothing else — no markdown fences, no explanation.`;

function buildUserPrompt(tweetText: string, tweetDate: string): string {
  return `Extract all military incident statistics from the following verified UAE Ministry of Defence statement.

STATEMENT DATE: ${tweetDate}
STATEMENT TEXT:
${tweetText}

EXTRACTION RULES:
- isRelevant: always true (this statement was manually verified as relevant before ingestion)
- confidence: set to 0.95 unless numbers are genuinely ambiguous or contradictory in the text itself, in which case use 0.75 and set needsReview=true
- needsReview: only true if the text contains conflicting numbers or is genuinely unclear — NOT for editorial judgment

WHAT TO EXTRACT — TWO TYPES OF EVENTS:

════════════════════════════════
TYPE 1 — TODAY'S INCIDENT ONLY  (isCumulative: false)
════════════════════════════════
Extract figures for the SPECIFIC ATTACK happening in this statement (today / this morning / this engagement).
If no today-specific attack figures exist, omit all TYPE 1 events.

COUNTING RULES for TYPE 1:
- countLaunched = total projectiles fired at UAE in this engagement.
- "engaged" / "تم التعامل": UAE air defence engaged the threat — treat as BOTH launched AND intercepted. Set countLaunched = N AND countIntercepted = N (same value).
- countIntercepted = destroyed/neutralised before reaching any surface ("intercepted", "destroyed", "shot down").
- countImpact = reached and struck UAE territory ("fell within the country", "struck [location]", "hit [area]").
- "fell into the sea" = NOT countImpact. Implicitly: countLaunched − countIntercepted − countImpact.
- Use null (not 0) for any field not explicitly stated in today's figures.
- If ballistic and cruise missiles are distinguished by count, return a SEPARATE TYPE 1 event per subcategory.
- If both missiles AND drones are in the same engagement, return a SEPARATE TYPE 1 event per category.

════════════════════════════════
TYPE 2 — CUMULATIVE CHECKPOINT  (isCumulative: true)
════════════════════════════════
Extract running totals for the ENTIRE CONFLICT signalled by: "since the start", "since the beginning", "since [date]", "so far", "in total since", "منذ بدء", "منذ بداية".
These are the authoritative total counts from conflict start up to and including this statement date.

RULES for TYPE 2:
- Use the STATEMENT DATE as the event date for all TYPE 2 events.
- Set countLaunched = the total number stated. Set countIntercepted = same value.
- countImpact = null. location = null. interceptionSystem = null. notes = null.
- Return a SEPARATE TYPE 2 event for each distinct category+subcategory combination mentioned (e.g. "314 ballistic missiles" → one MISSILE/ballistic event; "15 cruise missiles" → one MISSILE/cruise event; "1,672 UAVs" → one DRONE/UAV event).
- If no cumulative totals are stated, omit all TYPE 2 events.

Arabic numerals (٠١٢٣٤٥٦٧٨٩): always convert to integers.
For correction/update statements: set notes on the relevant TYPE 1 event(s) to explain what was revised.

Respond ONLY with this exact JSON (no markdown, no prose):
{
  "isRelevant": true,
  "confidence": number,
  "needsReview": boolean,
  "events": [
    {
      "date": "YYYY-MM-DD",
      "category": "MISSILE" | "DRONE" | "OTHER",
      "subcategory": "ballistic" | "cruise" | "UAV" | "unknown" | null,
      "countLaunched": number | null,
      "countIntercepted": number | null,
      "countImpact": number | null,
      "location": string | null,
      "interceptionSystem": string | null,
      "notes": string | null,
      "isCumulative": false
    },
    {
      "date": "YYYY-MM-DD",
      "category": "MISSILE" | "DRONE" | "OTHER",
      "subcategory": "ballistic" | "cruise" | "UAV" | "unknown" | null,
      "countLaunched": number,
      "countIntercepted": number,
      "countImpact": null,
      "location": null,
      "interceptionSystem": null,
      "notes": null,
      "isCumulative": true
    }
  ]
}`;
}

export async function classifyAndExtract(
  tweetText: string,
  tweetDate: string
): Promise<ClaudeExtractionResult> {
  let raw: string;

  try {
    const message = await getClient().messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildUserPrompt(tweetText, tweetDate),
        },
      ],
    });

    raw =
      message.content[0].type === "text" ? message.content[0].text.trim() : "";
  } catch (err) {
    console.error("[claude] API error:", err);
    // Return a safe fallback — mark for manual review
    return {
      isRelevant: false,
      confidence: 0,
      needsReview: true,
      events: [],
    };
  }

  try {
    // Strip any accidental markdown fences
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(cleaned) as ClaudeExtractionResult;
    return parsed;
  } catch (err) {
    console.error("[claude] JSON parse error:", err, "\nRaw response:", raw);
    return {
      isRelevant: false,
      confidence: 0,
      needsReview: true,
      events: [],
    };
  }
}
