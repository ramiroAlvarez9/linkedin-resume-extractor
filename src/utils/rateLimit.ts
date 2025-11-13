import { createClient, SupabaseClient } from "@supabase/supabase-js";

type RateLimitOptions = {
  route: string;
  limit: number; // max requests per window
  windowSeconds: number; // window size
};

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  supabase = createClient(url, key, {
    auth: { persistSession: false },
  });
  return supabase;
}

function getClientIp(req: Request): string {
  const hdr = (name: string) => req.headers.get(name) || "";
  const forwarded = hdr("x-forwarded-for") || hdr("forwarded");
  if (forwarded) {
    const ip = forwarded.split(",")[0]?.trim();
    if (ip) return ip;
  }
  const real = hdr("x-real-ip") || hdr("cf-connecting-ip") || hdr("fly-client-ip");
  if (real) return real;
  // Bun.serve doesn't expose remoteAddr yet; fall back
  return "127.0.0.1";
}

// Supabase table: rate_limit_requests (id uuid default gen_random_uuid(), ip text, route text, ts timestamptz default now())
export async function enforceRateLimit(
  req: Request,
  opts: RateLimitOptions,
) {
  const ip = getClientIp(req);
  const now = Date.now();
  const windowStart = new Date(now - opts.windowSeconds * 1000).toISOString();

  const client = getSupabase();

  // If Supabase is not configured, allow by default (dev mode)
  if (!client) {
    return {
      allowed: true,
      ip,
      remaining: Infinity,
      resetAt: new Date(now + opts.windowSeconds * 1000).toISOString(),
      reason: "supabase-not-configured",
    } as const;
  }

  // Count recent requests within window
  const { count, error: countErr } = await client
    .from("rate_limit_requests")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .eq("route", opts.route)
    .gt("ts", windowStart);

  if (countErr) {
    // Fail open to avoid blocking users due to DB hiccups
    return {
      allowed: true,
      ip,
      remaining: Infinity,
      resetAt: new Date(now + opts.windowSeconds * 1000).toISOString(),
      reason: "count-error",
    } as const;
  }

  if ((count ?? 0) >= opts.limit) {
    return {
      allowed: false,
      ip,
      remaining: 0,
      resetAt: new Date(now + opts.windowSeconds * 1000).toISOString(),
      reason: "rate-limit-exceeded",
    } as const;
  }

  // Record this request
  const { error: insertErr } = await client
    .from("rate_limit_requests")
    .insert({ ip, route: opts.route, ts: new Date().toISOString() });

  if (insertErr) {
    // Still allow; logging can be added here if desired
  }

  const remaining = Math.max(0, (opts.limit - 1) - (count ?? 0));
  return {
    allowed: true,
    ip,
    remaining,
    resetAt: new Date(now + opts.windowSeconds * 1000).toISOString(),
    reason: "ok",
  } as const;
}

export function rateLimitHeaders(
  opts: RateLimitOptions,
  result: Awaited<ReturnType<typeof enforceRateLimit>>,
) {
  return {
    "X-RateLimit-Limit": String(opts.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": result.resetAt,
  } as Record<string, string>;
}

