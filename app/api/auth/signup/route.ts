import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

const requestWindows = new Map<string, number[]>();

function readClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const firstForwarded = forwarded.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return firstForwarded || realIp || "unknown";
}

function pruneWindow(key: string, windowMs: number): number[] {
  const now = Date.now();
  const existing = requestWindows.get(key) || [];
  const fresh = existing.filter((time) => now - time < windowMs);
  requestWindows.set(key, fresh);
  return fresh;
}

function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const fresh = pruneWindow(key, windowMs);
  return fresh.length >= limit;
}

function registerAttempt(key: string): void {
  const list = requestWindows.get(key) || [];
  list.push(Date.now());
  requestWindows.set(key, list);
}

function normalizeEmail(value: unknown): string {
  return (value || "").toString().trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Signup is not configured." }, { status: 500 });
    }

    const body = await request.json();
    const email = normalizeEmail(body?.email);
    const password = (body?.password || "").toString();
    const captchaToken = (body?.captchaToken || "").toString().trim();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const clientIp = readClientIp(request);
    const ipKey = `signup:ip:${clientIp}`;
    const emailKey = `signup:email:${email}`;
    const oneHourMs = 60 * 60 * 1000;

    if (isRateLimited(ipKey, 8, oneHourMs) || isRateLimited(emailKey, 3, oneHourMs)) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please wait and try again." },
        { status: 429 }
      );
    }

    registerAttempt(ipKey);
    registerAttempt(emailKey);

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const redirectTo = siteUrl ? `${siteUrl.replace(/\/+$/, "")}/login` : undefined;
    const options: {
      emailRedirectTo?: string;
      captchaToken?: string;
    } = {};
    if (redirectTo) options.emailRedirectTo = redirectTo;
    if (captchaToken) options.captchaToken = captchaToken;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options,
    });

    if (error) {
      if (error.message.includes("already registered") || error.code === "user_already_exists") {
        return NextResponse.json(
          { error: "An account with this email already exists. Please log in." },
          { status: 409 }
        );
      }
      if (error.message.includes("captcha")) {
        return NextResponse.json(
          { error: "Signup verification failed. Please try again." },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message || "Could not create account." }, { status: 400 });
    }

    const requiresEmailConfirmation = !data.session;
    const message = requiresEmailConfirmation
      ? "Account created. Check your email to confirm your account before logging in."
      : "Account created successfully. You can now log in.";

    return NextResponse.json({
      success: true,
      message,
      requiresEmailConfirmation,
      user: {
        id: data.user?.id || null,
        email: data.user?.email || email,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
