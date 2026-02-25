import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

type Body = {
  articleId?: string;
  title?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const { articleId, title } = body;

    if (!articleId) {
      return NextResponse.json({ error: "Missing articleId" }, { status: 400 });
    }

    const { data: article, error: articleError } = await supabaseAdmin
      .from("articles")
      .select("id, title, status")
      .eq("id", articleId)
      .maybeSingle();

    if (articleError || !article?.id) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    if (!["approved", "published"].includes((article.status || "").toString())) {
      return NextResponse.json({ error: "Discussion unavailable for this article" }, { status: 400 });
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("discussions")
      .select("*")
      .eq("article_id", articleId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      return NextResponse.json({ error: "Failed to fetch discussion" }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ discussion: existing });
    }

    const heading = (title || article.title || "").toString().trim();
    const guidingQuestion = heading
      ? `What stood out to you in "${heading}"?`
      : "What stood out to you in this story?";

    const { data: created, error: createError } = await supabaseAdmin
      .from("discussions")
      .insert({ article_id: articleId, guiding_question: guidingQuestion })
      .select("*")
      .single();

    if (createError || !created) {
      return NextResponse.json({ error: "Failed to create discussion" }, { status: 500 });
    }

    return NextResponse.json({ discussion: created });
  } catch (err: any) {
    console.error("Ensure discussion error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
