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

WHAT TO EXTRACT — TODAY'S INCIDENT ONLY:
- Extract ONLY figures describing the SPECIFIC INCIDENT happening NOW (today, this morning, this engagement).
- COMPLETELY IGNORE any cumulative totals. These are signalled by phrases like: "since the start of the attack", "since the beginning", "since [date]", "so far", "in total since", "منذ بدء". Skip every number that follows such a phrase.
- If the statement contains ONLY cumulative totals and NO today-specific figures, return events: [].

COUNTING RULES — READ CAREFULLY:
- countLaunched = total projectiles fired at UAE in this engagement (intercepted + sea-falls + territory hits).
- countIntercepted = destroyed/neutralised in the air before reaching any surface ("intercepted", "destroyed", "shot down").
- countImpact = landed inside UAE territory and caused or could cause damage ("fell within the country", "struck [location]", "landed in territory", "hit [base/area]").
- "fell into the sea" / "fell into sea waters" = NOT countImpact. These missed UAE territory entirely. Do not count them as impacts. They are implicitly: countLaunched − countIntercepted − countImpact.

CATEGORY RULES:
- If today's engagement mentions both missiles AND drones, return a separate event object for each.
- If today's engagement distinguishes ballistic and cruise missiles by count, return a separate event object per subcategory.
- Use null (not 0) for any field not explicitly mentioned in today's figures.
- Arabic numerals (٠١٢٣٤٥٦٧٨٩): convert to integers.
- For correction/update statements: set notes to explain what was revised.

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
      "notes": string | null
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
      max_tokens: 1024,
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
