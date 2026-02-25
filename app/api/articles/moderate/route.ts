import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { getRequestUserId } from "../../../../lib/server-auth";

type Role = "reader" | "contributor" | "editor" | "moderator" | "admin";
type Action = "publish" | "return_to_draft";

const PRIVILEGED_ROLES: Role[] = ["editor", "moderator", "admin"];

function isPrivileged(role: Role): boolean {
  return PRIVILEGED_ROLES.includes(role);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getRequestUserId(request);
    if (!auth.userId) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const articleId = (body?.articleId || "").toString().trim();
    const action = (body?.action || "").toString().trim() as Action;

    if (!articleId || !["publish", "return_to_draft"].includes(action)) {
      return NextResponse.json({ error: "Missing or invalid action." }, { status: 400 });
    }

    const { data: roleRow } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", auth.userId)
      .maybeSingle();
    const role = ((roleRow?.role || "reader") as Role);
    const privileged = isPrivileged(role);

    const { data: article, error: articleError } = await supabaseAdmin
      .from("articles")
      .select("id, author_id, status")
      .eq("id", articleId)
      .single();

    if (articleError || !article) {
      return NextResponse.json({ error: "Article not found." }, { status: 404 });
    }

    const isAuthor = article.author_id === auth.userId;
    let allowed = false;

    if (action === "publish") {
      allowed = privileged || (isAuthor && article.status === "approved");
    } else if (action === "return_to_draft") {
      allowed = privileged || (isAuthor && article.status !== "published");
    }

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date().toISOString();
    const updatePayload: Record<string, unknown> =
      action === "publish"
        ? {
            status: "published",
            published_at: now,
            updated_at: now,
          }
        : {
            status: "draft",
            ai_status: null,
            ai_feedback: null,
            published_at: null,
            updated_at: now,
          };

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("articles")
      .update(updatePayload)
      .eq("id", articleId)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      article: updated,
      action,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
