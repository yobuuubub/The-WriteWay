// app/api/updateArticle/route.ts
// Update an existing article and replace its media gallery.

import { NextRequest, NextResponse } from "next/server";
import { reviewArticleWithAI, type AIReviewResult } from "../../../lib/ai-review";
import { hasVisibleText, stripHtmlToText } from "../../../lib/content-text";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { getRequestUserId } from "../../../lib/server-auth";

type MediaItem = { url: string; caption?: string };
const AI_REVIEW_TIMEOUT_MS = Number(process.env.AI_REVIEW_TIMEOUT_MS || 30000);

function decisionToStatus(decision: AIReviewResult["decision"]): "approved" | "needs_revision" | "rejected" {
  if (decision === "approved") return "approved";
  if (decision === "needs_revision") return "needs_revision";
  return "rejected";
}

async function persistReviewResult(articleId: string, aiResult: AIReviewResult): Promise<boolean> {
  const nextStatus = decisionToStatus(aiResult.decision);
  const reviewPayload: Record<string, unknown> = {
    status: nextStatus,
    type: aiResult.category,
    ai_status: aiResult.decision,
    ai_feedback: aiResult.feedback,
  };
  if (nextStatus === "approved") {
    reviewPayload.published_at = new Date().toISOString();
  }
  if (aiResult.raw) {
    reviewPayload.ai_raw_response = aiResult.raw;
  }

  let { error } = await supabaseAdmin
    .from("articles")
    .update(reviewPayload)
    .eq("id", articleId);

  if (error && ((error as any)?.code === "PGRST204" || (error as any)?.message?.includes("Could not find the 'ai_raw_response'"))) {
    const retryPayload = { ...reviewPayload };
    delete (retryPayload as any).ai_raw_response;
    const retry = await supabaseAdmin
      .from("articles")
      .update(retryPayload)
      .eq("id", articleId);
    error = retry.error || null;
  }

  if (error) {
    console.error("Failed to persist AI review on update:", error);
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
    const articleId = (body?.articleId || "").toString();
    const title = (body?.title || "").toString().trim();
    const type = (body?.type || "").toString();
    const content = (body?.content || "").toString();
    const disclosure = body?.disclosure ? String(body.disclosure) : null;
    const contextBox = body?.contextBox ? String(body.contextBox) : null;
    const media = body?.media;

    if (!articleId || !title || !type || !hasVisibleText(content)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const validTypes = ["reporting", "explainer", "perspective", "letter"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid article type" }, { status: 400 });
    }

    const mediaList: MediaItem[] = Array.isArray(media) ? media : [];
    const firstValidMedia = mediaList.find((item) => {
      const url = typeof item?.url === "string" ? item.url.trim() : "";
      return /^https?:\/\//i.test(url);
    });

    if (mediaList.length > 0 && !firstValidMedia) {
      return NextResponse.json(
        { error: "Invalid media URL. Wait for image upload to finish and try again." },
        { status: 400 }
      );
    }

    const { data: existing } = await supabaseAdmin
      .from("articles")
      .select("id, author_id, status")
      .eq("id", articleId)
      .single();

    if (!existing || existing.author_id !== auth.userId) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    const updatePayload: Record<string, unknown> = {
      title,
      type,
      content,
      disclosure,
      context_box: contextBox,
      status: "pending_ai_review",
      ai_status: null,
      ai_feedback: null,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("articles")
      .update(updatePayload)
      .eq("id", articleId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Replace with one primary media image
    const { error: mediaDeleteError } = await supabaseAdmin
      .from("article_media")
      .delete()
      .eq("article_id", articleId);
    if (mediaDeleteError) {
      const missingTable =
        mediaDeleteError.code === "PGRST205" ||
        /Could not find the table 'public\.article_media'/i.test(mediaDeleteError.message || "");
      if (missingTable) {
        return NextResponse.json(
          { error: "Database table 'article_media' is missing. Run supabase_article_media.sql in Supabase SQL Editor." },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: mediaDeleteError.message }, { status: 500 });
    }

    if (firstValidMedia) {
      const { error: mediaInsertError } = await supabaseAdmin.from("article_media").insert({
        article_id: articleId,
        url: firstValidMedia.url.trim(),
        caption: firstValidMedia.caption || null,
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
    let reviewError: string | null = null;
    let message = "Article updated and queued for AI review.";

    try {
      const aiResult = await runReviewWithTimeout({
        title,
        content: stripHtmlToText(content),
        article_type: type,
        disclosure: disclosure || "",
      });
      reviewCompleted = await persistReviewResult(articleId, aiResult);
      if (reviewCompleted) {
        message = "Article updated and reviewed successfully.";
      }
    } catch (error: any) {
      reviewError = error?.message || "AI review failed";
      console.error("AI review failed after article update:", error);
    }

    let articlePayload = updated;
    if (reviewCompleted) {
      const { data: refreshed } = await supabaseAdmin
        .from("articles")
        .select("*")
        .eq("id", articleId)
        .single();
      articlePayload = refreshed || updated;
    }

    return NextResponse.json({
      success: true,
      article: articlePayload,
      reviewed: reviewCompleted,
      reviewError,
      message,
    });
  } catch (error: any) {
    console.error("Update article error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update article" },
      { status: 500 }
    );
  }
}
