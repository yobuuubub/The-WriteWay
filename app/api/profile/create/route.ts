// app/api/profile/create/route.ts
// Create or update the current user's profile using the service role key.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

function normalizeHandle(input: string) {
  return (input || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user?.id) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    const body = await request.json();
    const displayName = (body?.display_name || "").toString().trim();
    const handleInput = (body?.handle || displayName || "").toString();
    const handle = normalizeHandle(handleInput);
    if (!handle) {
      return NextResponse.json({ error: "Handle is required." }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("id")
      .ilike("handle", handle)
      .maybeSingle();
    if (existing && existing.id !== userData.user.id) {
      return NextResponse.json({ error: "That handle is already taken." }, { status: 409 });
    }

    const payload = {
      id: userData.user.id,
      display_name: displayName || userData.user.email?.split("@")[0] || "User",
      handle,
      bio: (body?.bio || "").toString().trim() || null,
      tagline: (body?.tagline || "").toString().trim() || null,
    };

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("users")
      .upsert([payload], { onConflict: "id" })
      .select("handle")
      .single();

    if (updateError || !updated?.handle) {
      const message = updateError?.message || "";
      if (message.includes("schema cache") || message.includes("Could not find the 'bio' column")) {
        const minimalPayload = {
          id: userData.user.id,
          display_name: displayName || userData.user.email?.split("@")[0] || "User",
          handle,
        };
        const { data: retryUpdated, error: retryError } = await supabaseAdmin
          .from("users")
          .upsert([minimalPayload], { onConflict: "id" })
          .select("handle")
          .single();
        if (retryError || !retryUpdated?.handle) {
          return NextResponse.json(
            { error: retryError?.message || "Could not create profile." },
            { status: 400 }
          );
        }
        return NextResponse.json({ handle: retryUpdated.handle, warning: "Profile created without bio/tagline." });
      }
      if (message.includes("Could not find the 'handle' column")) {
        const minimalPayload = {
          id: userData.user.id,
          display_name: displayName || userData.user.email?.split("@")[0] || "User",
        };
        const { error: retryError } = await supabaseAdmin
          .from("users")
          .upsert([minimalPayload], { onConflict: "id" });
        if (retryError) {
          return NextResponse.json(
            { error: retryError?.message || "Could not create profile." },
            { status: 400 }
          );
        }
        return NextResponse.json({
          handle: userData.user.id,
          warning: "Profile created without handle/bio/tagline.",
        });
      }
      return NextResponse.json(
        { error: updateError?.message || "Could not create profile." },
        { status: 400 }
      );
    }

    return NextResponse.json({ handle: updated.handle });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
