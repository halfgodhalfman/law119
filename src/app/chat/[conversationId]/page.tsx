import { RealtimeChat } from "../../../components/realtime-chat";
import { requireAuthContext } from "../../../lib/auth-context";
import { LockClosedIcon } from "../../../components/ui/icons";
import Link from "next/link";

type PageProps = {
  params: Promise<{ conversationId: string }>;
};

export default async function ChatPage({ params }: PageProps) {
  const routeParams = await params;
  const auth = await requireAuthContext().catch(() => null);
  if (!auth || (auth.role !== "CLIENT" && auth.role !== "ATTORNEY")) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-800 p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-900/40">
            <LockClosedIcon className="h-7 w-7 text-rose-400" />
          </div>
          <h1 className="text-lg font-bold text-white">Access Denied / 访问被拒绝</h1>
          <p className="mt-2 text-sm text-slate-400">
            Please sign in to access this conversation.
            <span className="block mt-1">请登录后访问此对话。</span>
          </p>
          <Link
            href="/auth/sign-in"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 transition-colors"
          >
            Sign In / 登录
          </Link>
        </div>
      </main>
    );
  }

  return (
    <RealtimeChat conversationId={routeParams.conversationId} viewerRole={auth.role} />
  );
}
