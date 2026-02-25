import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { reviewArticleWithAI, type AIReviewResult } from "../../../lib/ai-review";
import { hasVisibleText, stripHtmlToText } from "../../../lib/content-text";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { getRequestUserId } from "../../../lib/server-auth";

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") || "article";
}

function uniqueSlug(title: string): string {
  const base = slugify(title);
  const suffix = randomUUID().slice(0, 8);
  return `${base}-${suffix}`;
}

const AI_REVIEW_TIMEOUT_MS = Number(process.env.AI_REVIEW_TIMEOUT_MS || 30000);

function decisionToStatus(decision: AIReviewResult["decision"]): "approved" | "needs_revision" | "rejected" {
  if (decision === "approved") return "approved";
  if (decision === "needs_revision") return "needs_revision";
  return "rejected";
}

async function persistReviewResult(articleId: string, aiResult: AIReviewResult): Promise<boolean> {
  const nextStatus = decisionToStatus(aiResult.decision);
  const updatePayload: Record<string, unknown> = {
    status: nextStatus,
    type: aiResult.category,
    ai_status: aiResult.decision,
    ai_feedback: aiResult.feedback,
  };
  if (nextStatus === "approved") {
    updatePayload.published_at = new Date().toISOString();
  }
  if (aiResult.raw) {
    updatePayload.ai_raw_response = aiResult.raw;
  }

  let { error } = await supabaseAdmin
    .from("articles")
    .update(updatePayload)
    .eq("id", articleId);

  if (error && ((error as any)?.code === "PGRST204" || (error as any)?.message?.includes("Could not find the 'ai_raw_response'"))) {
    const retryPayload = { ...updatePayload };
    delete (retryPayload as any).ai_raw_response;
    const retry = await supabaseAdmin
      .from("articles")
      .update(retryPayload)
      .eq("id", articleId);
    error = retry.error || null;
  }

  if (error) {
    console.error("Failed to persist AI review:", error);
    return false;
  }

  return true;
}

async function runReviewWithTimeout(input: {
  title: string;
  content: string;
  article_type: string;
  disclosure: string;
}): Promise<AIReviewResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise<AIReviewResult>((_, reject) => {
      timer = setTimeout(() => reject(new Error("AI review timed out")), AI_REVIEW_TIMEOUT_MS);
    });
    return await Promise.race([reviewArticleWithAI(input), timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getRequestUserId(request);
    if (!auth.userId) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const title = (body?.title || "").toString().trim();
    const type = (body?.type || "").toString();
    const content = (body?.content || "").toString();
    const disclosure = body?.disclosure ? String(body.disclosure) : null;
    const contextBox = body?.contextBox ? String(body.contextBox) : null;
    const media = body?.media;

    if (!title || !type || !hasVisibleText(content)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const validTypes = ["reporting", "explainer", "perspective", "letter"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid article type" }, { status: 400 });
    }

    const mediaList = Array.isArray(media) ? media : [];
    const firstValidMedia = mediaList.find((item: any) => {
      const url = typeof item?.url === "string" ? item.url.trim() : "";
      return /^https?:\/\//i.test(url);
    });

    if (mediaList.length > 0 && !firstValidMedia) {
      return NextResponse.json(
        { error: "Invalid media URL. Wait for image upload to finish and try again." },
        { status: 400 }
      );
    }

    const slug = uniqueSlug(title);

    const { data, error } = await supabaseAdmin
      .from("articles")
      .insert([
        {
          title,
          slug,
          type,
          content,
          author_id: auth.userId,
          status: "pending_ai_review",
          disclosure,
          context_box: contextBox,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (firstValidMedia) {
      const { error: mediaInsertError } = await supabaseAdmin.from("article_media").insert({
        article_id: data.id,
        url: String(firstValidMedia.url).trim(),
        caption: firstValidMedia.caption ? String(firstValidMedia.caption) : null,
        sort_order: 0,
      });

      if (mediaInsertError) {
        const missingTable =
          mediaInsertError.code === "PGRST205" ||
          /Could not find the table 'public\.article_media'/i.test(mediaInsertError.message || "");

        if (missingTable) {
          return NextResponse.json(
            { error: "Database table 'article_media' is missing. Run supabase_article_media.sql in Supabase SQL Editor." },
            { status: 500 }
          );
        }

        return NextResponse.json({ error: mediaInsertError.message }, { status: 500 });
      }
    }

    let reviewCompleted = false;
    let reviewMessage = "Article submitted for review. AI review is pending.";
    let reviewError: string | null = null;

    try {
      const aiResult = await runReviewWithTimeout({
        title: data.title,
        content: stripHtmlToText(data.content || ""),
        article_type: data.type,
        disclosure: data.disclosure || "",
      });
      reviewCompleted = await persistReviewResult(data.id, aiResult);
      if (reviewCompleted) {
        reviewMessage = "Article submitted and reviewed successfully.";
      }
    } catch (aiError: any) {
      reviewError = aiError?.message || "AI review failed";
      console.error("AI review error during submission:", aiError);
    }

    let articlePayload = data;
    if (reviewCompleted) {
      const { data: refreshed } = await supabaseAdmin
        .from("articles")
        .select("*")
        .eq("id", data.id)
        .single();
      articlePayload = refreshed || data;
    }

    return NextResponse.json({
      success: true,
      article: articlePayload,
      reviewed: reviewCompleted,
      message: reviewMessage,
      reviewError,
    });
  } catch (error: any) {
    console.error("Submit article error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit article" },
      { status: 500 }
    );
  }
}
