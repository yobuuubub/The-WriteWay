import Anthropic from "@anthropic-ai/sdk";

export type ArticleCategory = "reporting" | "explainer" | "perspective" | "letter";

export type AIReviewResult = {
  decision: "approved" | "needs_revision" | "rejected";
  feedback: string;
  category: ArticleCategory;
  raw?: string;
};

const VALID_DECISIONS: AIReviewResult["decision"][] = ["approved", "needs_revision", "rejected"];
const VALID_CATEGORIES: ArticleCategory[] = ["reporting", "explainer", "perspective", "letter"];

const anthropicApiKey = (process.env.ANTHROPIC_API_KEY || "").trim();
const anthropicClient = anthropicApiKey ? new Anthropic({ apiKey: anthropicApiKey }) : null;
const anthropicModel = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

const SYSTEM_PROMPT = `You are an editorial reviewer for a youth journalism platform.

You must do all 3 tasks:
1) Decide moderation outcome.
2) Classify article category.
3) Give short constructive feedback.

Categories:
- reporting: original reporting, sourcing, interviews, observed events
- explainer: analysis, context, breakdown of events/concepts
- perspective: opinion/editorial/argument from the writer's point of view
- letter: short personal note, open letter, or direct message style writing

Moderation outcome:
- approved: publishable now
- needs_revision: real attempt but needs work
- rejected: only for clear safety violations or obvious abuse

Important policy:
- Be strict but fair.
- Prefer "needs_revision" over "rejected" for normal quality problems.
- Use "rejected" ONLY for: hate speech, threats/incitement, explicit sexual content involving minors, violent extremism, or blatant spam/gibberish abuse.
- Do NOT reject simply for being imperfect, underdeveloped, or missing structure.

Return ONLY valid JSON:
{
  "decision": "approved" | "needs_revision" | "rejected",
  "category": "reporting" | "explainer" | "perspective" | "letter",
  "feedback": "2-4 sentences that clearly explain why and how to improve if needed"
}`;

function isHardRejectContent(text: string): boolean {
  const normalized = (text || "").toLowerCase();
  const hardRejectPatterns: RegExp[] = [
    /\b(nigger|faggot|kike)\b/,
    /\b(kill (them|all)|shoot (them|up)|bomb (them|it)|lynch)\b/,
    /\b(heil hitler|white power)\b/,
    /\b(child porn|cp)\b/,
  ];

  if (hardRejectPatterns.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  // simple spam/gibberish abuse signals
  const repeatedCharRun = /(.)\1{18,}/.test(normalized);
  const links = (normalized.match(/https?:\/\//g) || []).length;
  const veryShort = normalized.replace(/\s+/g, "").length < 35;
  if ((repeatedCharRun && veryShort) || links >= 6) {
    return true;
  }

  return false;
}

function normalizeDecision(value: unknown): AIReviewResult["decision"] {
  if (typeof value !== "string") return "needs_revision";
  return VALID_DECISIONS.includes(value as AIReviewResult["decision"])
    ? (value as AIReviewResult["decision"])
    : "needs_revision";
}

function normalizeCategory(value: unknown, fallbackType?: string): ArticleCategory {
  const source = typeof value === "string" ? value : "";
  const candidate = source.toLowerCase().trim();
  if (VALID_CATEGORIES.includes(candidate as ArticleCategory)) {
    return candidate as ArticleCategory;
  }
  const fallback = (fallbackType || "").toLowerCase().trim();
  if (VALID_CATEGORIES.includes(fallback as ArticleCategory)) {
    return fallback as ArticleCategory;
  }
  return "explainer";
}

function classifyByHeuristic(input: {
  title: string;
  content: string;
  article_type: string;
}): ArticleCategory {
  const fallback = normalizeCategory(input.article_type, "explainer");
  const text = `${input.title}\n${input.content}`.toLowerCase();

  if (/\b(opinion|i believe|i think|in my view|from my perspective)\b/.test(text)) {
    return "perspective";
  }
  if (/\b(dear |sincerely|open letter|to the editor)\b/.test(text)) {
    return "letter";
  }
  if (/\b(interview|reported|according to|sources?|witness|on the scene)\b/.test(text)) {
    return "reporting";
  }
  if (/\b(explainer|how it works|what this means|breakdown|analysis)\b/.test(text)) {
    return "explainer";
  }
  return fallback;
}

function localHeuristicReview(article: {
  title: string;
  content: string;
  article_type: string;
  disclosure: string;
}): AIReviewResult {
  const text = `${article.title}\n${article.content}`.toLowerCase();
  const category = classifyByHeuristic(article);

  const rejectPatterns = [/\bkill\b/, /\bbomb\b/, /\bshoot\b/, /\bkill the\b/];
  if (rejectPatterns.some((pattern) => pattern.test(text))) {
    return {
      decision: "rejected",
      category,
      feedback: "This submission contains clearly harmful violent language and cannot be published.",
    };
  }

  const hateful = [/\b(nigger|faggot|kike)\b/];
  if (hateful.some((pattern) => pattern.test(text))) {
    return {
      decision: "rejected",
      category,
      feedback: "This submission contains hate speech and cannot be published.",
    };
  }

  if (article.article_type === "reporting" && (!article.disclosure || article.disclosure.trim().length === 0)) {
    return {
      decision: "needs_revision",
      category,
      feedback: "Please add a clear disclosure describing your sourcing and how you know the reported information.",
    };
  }

  if (!article.content || article.content.trim().length < 200) {
    return {
      decision: "needs_revision",
      category,
      feedback: "This draft is too short to evaluate. Expand it into a few solid paragraphs with a clear structure.",
    };
  }

  return {
    decision: "approved",
    category,
    feedback: "The draft is coherent, readable, and suitable to publish.",
  };
}

async function callAnthropicReview(input: {
  title: string;
  content: string;
  article_type: string;
  disclosure: string;
}): Promise<AIReviewResult> {
  if (!anthropicClient) {
    throw new Error("Anthropic API key is not configured.");
  }

  const userMessage = `Review this article.

Title: ${input.title}
SubmittedType: ${input.article_type}
Disclosure: ${input.disclosure || "(none)"}

Content:
${input.content}`;

  const message = await anthropicClient.messages.create({
    model: anthropicModel,
    max_tokens: 700,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const raw = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text)
    .join("\n")
    .trim();

  const cleaned = raw.replace(/```json|```/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const jsonCandidate = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  const parsed = JSON.parse(jsonCandidate) as {
    decision?: string;
    feedback?: string;
    category?: string;
  };

  return {
    decision: normalizeDecision(parsed.decision),
    category: normalizeCategory(parsed.category, input.article_type),
    feedback: typeof parsed.feedback === "string" && parsed.feedback.trim()
      ? parsed.feedback.trim()
      : "Thank you for your submission. Please revise and resubmit.",
    raw,
  };
}

export async function reviewArticleWithAI(article: {
  title: string;
  content: string;
  article_type: string;
  disclosure: string;
}): Promise<AIReviewResult> {
  try {
    const hardReject = isHardRejectContent(`${article.title}\n${article.content}`);
    if (anthropicClient) {
      try {
        const modelResult = await callAnthropicReview(article);
        // Keep the bar strict, but avoid discouraging users with over-rejection.
        if (modelResult.decision === "rejected" && !hardReject) {
          return {
            ...modelResult,
            decision: "needs_revision",
            feedback:
              "This draft shows potential but needs revision before publication. " +
              modelResult.feedback,
          };
        }
        return modelResult;
      } catch (error) {
        console.error("Anthropic review failed, falling back:", error);
      }
    }

    const fallback = localHeuristicReview(article);
    return {
      ...fallback,
      feedback: `${fallback.feedback} (review performed by fallback rules)`,
      raw: `FALLBACK:${JSON.stringify(fallback)}`,
    };
  } catch (error) {
    console.error("AI review error:", error);
    return {
      decision: "needs_revision",
      category: normalizeCategory(article.article_type, "explainer"),
      feedback: "Unable to complete automated review. Please revise for clarity and try again.",
      raw: "AI_ERROR",
    };
  }
}
