/**
 * Law119 Rate Limiter
 *
 * 双模式运行：
 * - 生产/Vercel 环境：使用 Upstash Redis（需设置 UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN）
 * - 本地开发：内存 LRU 限流（进程重启后重置，仅供开发测试用）
 *
 * 使用方法：
 *   const result = await rateLimit(request, "CASE_POST");
 *   if (!result.success) return rateLimitResponse(result);
 */

import { NextRequest, NextResponse } from "next/server";

// ─── 速率限制配置（各端点限额）────────────────────────────────────────────────

export type RateLimitPreset =
  | "CASE_POST"          // 案件发布：5次/小时/用户
  | "BID_SUBMIT"         // 竞价提交：10次/小时/律师
  | "FILE_UPLOAD"        // 文件上传：20次/小时/用户
  | "DISPUTE_POST"       // 投诉提交：3次/天/用户
  | "LOGIN_ATTEMPT"      // 登录尝试：5次/15分钟/IP
  | "REFERRAL_POST"      // 转介绍发送：10次/小时/律师
  | "SUPPORT_TICKET"     // 工单创建：5次/小时/用户
  | "FORM_SUBMISSION"    // 法律文书提交：10次/小时/用户
  | "NOTIFICATION_READ"  // 通知读取：60次/分钟/用户
  | "API_GENERAL";       // 通用 API：200次/分钟/IP

type LimitConfig = { limit: number; windowSeconds: number };

const PRESETS: Record<RateLimitPreset, LimitConfig> = {
  CASE_POST:          { limit: 5,   windowSeconds: 3600 },   // 5/hr
  BID_SUBMIT:         { limit: 10,  windowSeconds: 3600 },   // 10/hr
  FILE_UPLOAD:        { limit: 20,  windowSeconds: 3600 },   // 20/hr
  DISPUTE_POST:       { limit: 3,   windowSeconds: 86400 },  // 3/day
  LOGIN_ATTEMPT:      { limit: 5,   windowSeconds: 900 },    // 5/15min
  REFERRAL_POST:      { limit: 10,  windowSeconds: 3600 },   // 10/hr
  SUPPORT_TICKET:     { limit: 5,   windowSeconds: 3600 },   // 5/hr
  FORM_SUBMISSION:    { limit: 10,  windowSeconds: 3600 },   // 10/hr
  NOTIFICATION_READ:  { limit: 60,  windowSeconds: 60 },     // 60/min
  API_GENERAL:        { limit: 200, windowSeconds: 60 },     // 200/min
};

// ─── 结果类型 ────────────────────────────────────────────────────────────────

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp (seconds)
  identifier: string;
  preset: RateLimitPreset;
};

// ─── 内存限流（开发环境 fallback）────────────────────────────────────────────

type MemEntry = { count: number; resetAt: number };
const memStore = new Map<string, MemEntry>();

// 每分钟清理过期条目，防止内存泄漏
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memStore.entries()) {
      if (entry.resetAt < now) memStore.delete(key);
    }
  }, 60_000);
}

function memRateLimit(key: string, config: LimitConfig): RateLimitResult {
  const now = Date.now();
  const existing = memStore.get(key);

  if (!existing || existing.resetAt < now) {
    // 窗口已过期或首次请求，重置
    const resetAt = now + config.windowSeconds * 1000;
    memStore.set(key, { count: 1, resetAt });
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: Math.ceil(resetAt / 1000),
      identifier: key,
      preset: "API_GENERAL",
    };
  }

  existing.count += 1;
  const remaining = Math.max(0, config.limit - existing.count);
  return {
    success: existing.count <= config.limit,
    limit: config.limit,
    remaining,
    reset: Math.ceil(existing.resetAt / 1000),
    identifier: key,
    preset: "API_GENERAL",
  };
}

// ─── Upstash Redis 限流（生产环境）──────────────────────────────────────────

let _upstashRatelimit: unknown = null;
let _upstashRedis: unknown = null;

async function getUpstashLimiter() {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return null;

  try {
    // 动态 import — 避免在没有安装包时编译失败
    const [{ Ratelimit }, { Redis }] = await Promise.all([
      import("@upstash/ratelimit"),
      import("@upstash/redis"),
    ]);
    if (!_upstashRedis) {
      _upstashRedis = new Redis({ url: redisUrl, token: redisToken });
    }
    if (!_upstashRatelimit) {
      _upstashRatelimit = Ratelimit;
    }
    return { Ratelimit: _upstashRatelimit as typeof Ratelimit, redis: _upstashRedis as InstanceType<typeof Redis> };
  } catch {
    return null;
  }
}

// ─── 主函数 ──────────────────────────────────────────────────────────────────

/**
 * 从请求中提取客户端标识符（优先用户 ID，其次 IP）
 */
export function getRequestIdentifier(request: NextRequest | Request, userId?: string | null): string {
  if (userId) return `uid:${userId}`;
  // 尝试从 Vercel/CF/Nginx 代理头获取 IP
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfIp = request.headers.get("cf-connecting-ip");
  const ip = cfIp ?? (forwarded ? forwarded.split(",")[0].trim() : null) ?? realIp ?? "unknown";
  return `ip:${ip}`;
}

/**
 * 执行速率限制检查
 * @param identifier - 用户 ID 或 IP 标识符
 * @param preset - 预设限额类型
 */
export async function rateLimit(
  identifier: string,
  preset: RateLimitPreset,
): Promise<RateLimitResult> {
  const config = PRESETS[preset];
  const key = `rl:${preset}:${identifier}`;

  // 尝试使用 Upstash（生产环境）
  const upstash = await getUpstashLimiter().catch(() => null);
  if (upstash) {
    try {
      const { Ratelimit, redis } = upstash;
      const limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.limit, `${config.windowSeconds} s`),
        prefix: "law119",
      });
      const result = await limiter.limit(key);
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: Math.ceil(result.reset / 1000),
        identifier,
        preset,
      };
    } catch (err) {
      console.warn("[RateLimit] Upstash error, falling back to memory limiter:", err);
    }
  }

  // fallback：内存限流
  const result = memRateLimit(key, config);
  return { ...result, preset };
}

/**
 * 生成速率限制超出时的标准 429 响应
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: "请求过于频繁，请稍后再试。",
      error_en: "Too many requests. Please try again later.",
      retryAfter: result.reset - Math.floor(Date.now() / 1000),
    },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.reset),
        "Retry-After": String(result.reset - Math.floor(Date.now() / 1000)),
      },
    },
  );
}
