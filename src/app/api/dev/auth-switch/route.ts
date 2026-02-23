import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DEV_ACTORS, DEV_AUTH_COOKIE, ensureDevActor, getDevActorSeed, isDevAuthSwitchEnabled } from "@/lib/dev-auth-switch";

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
    secure: false,
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

