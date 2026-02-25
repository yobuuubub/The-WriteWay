import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { getRequestUserId } from "../../../lib/server-auth";

const MEDIA_BUCKET = "article-media";
const MAX_FILE_BYTES = 8 * 1024 * 1024;

function safeExt(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase() || "";
  if (/^[a-z0-9]+$/.test(fromName)) return fromName;
  const fromType = file.type.split("/").pop()?.toLowerCase() || "";
  if (/^[a-z0-9]+$/.test(fromType)) return fromType;
  return "jpg";
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getRequestUserId(request);
    if (!auth.userId) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const formData = await request.formData();
    const maybeFile = formData.get("file");
    if (!(maybeFile instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (!maybeFile.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are allowed" }, { status: 400 });
    }

    if (maybeFile.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "Image must be 8MB or smaller" }, { status: 400 });
    }

    const ext = safeExt(maybeFile);
    const path = `${auth.userId}/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage.from(MEDIA_BUCKET).upload(path, maybeFile, {
      upsert: true,
      cacheControl: "3600",
      contentType: maybeFile.type,
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data } = supabaseAdmin.storage.from(MEDIA_BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}
