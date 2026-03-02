export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DEV_ACTORS, DEV_AUTH_COOKIE, ensureDevActor, getDevActorSeed, isDevAuthSwitchEnabled, isLocalOriginRequest } from "@/lib/dev-auth-switch";

function disabled() {
  return NextResponse.json({ error: "Dev auth switch disabled." }, { status: 404 });
}

export async function GET() {
  if (!isDevAuthSwitchEnabled()) return disabled();
  const cookieStore = await cookies();
  const currentKey = cookieStore.get(DEV_AUTH_COOKIE)?.value ?? null;
  return NextResponse.json({
    ok: true,
    enabled: true,
    current: getDevActorSeed(currentKey),
    actors: DEV_ACTORS,
  });
}

export async function POST(request: Request) {
  if (!isDevAuthSwitchEnabled()) return disabled();
  // 额外安全校验：只允许本地直接请求（无代理头），防止被远程调用
  if (!isLocalOriginRequest(request)) return disabled();
  const body = (await request.json().catch(() => ({}))) as { actor?: string };
  const actor = getDevActorSeed(body.actor);
  if (!actor) {
    return NextResponse.json({ error: "Invalid actor." }, { status: 400 });
  }
  await ensureDevActor(actor.key);
  const cookieStore = await cookies();
  cookieStore.set(DEV_AUTH_COOKIE, actor.key, {
    httpOnly: true,
    sameSite: "lax",
    // 修复 #2: secure 标志跟随环境，HTTPS 环境自动启用
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return NextResponse.json({ ok: true, actor });
}

export async function DELETE() {
  if (!isDevAuthSwitchEnabled()) return disabled();
  const cookieStore = await cookies();
  cookieStore.delete(DEV_AUTH_COOKIE);
  return NextResponse.json({ ok: true });
}

