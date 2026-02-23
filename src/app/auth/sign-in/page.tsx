"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "../../../lib/supabase-browser";
import { ScalesIcon, ShieldCheckIcon, EyeIcon, EyeSlashIcon, SpinnerIcon } from "../../../components/ui/icons";

type Role = "CLIENT" | "ATTORNEY" | "ADMIN";
type Mode = "signin" | "signup";

function SignInForm() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const initialRole: Role =
    roleParam === "attorney" ? "ATTORNEY" : roleParam === "admin" ? "ADMIN" : "CLIENT";
  const initialMode: Mode = searchParams.get("mode") === "signin" ? "signin" : "signup";

  const [role, setRole] = useState<Role>(initialRole);
  const [mode, setMode] = useState<Mode>(
    initialRole === "ADMIN"
      ? "signin"
      : initialMode === "signin"
        ? "signin"
        : initialRole === "ATTORNEY"
          ? "signup"
          : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const headerSubtitle =
    role === "CLIENT"
      ? mode === "signin"
        ? "Welcome back. Access your client dashboard."
        : "Create a free account to post your case."
      : role === "ADMIN"
        ? "Admin portal — sign in to review and manage marketplace cases."
        : mode === "signin"
          ? "Attorney portal — access your case feed."
          : "Join as a verified attorney to receive matched cases.";

  // Preserved exactly from original
  const onSignIn = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    window.location.href =
      role === "ADMIN"
        ? "/marketplace/admin/cases"
        : role === "ATTORNEY"
          ? "/attorney/dashboard"
          : "/client/dashboard";
  };

  // Preserved exactly from original, with redirect added
  const onSignUp = async () => {
    setLoading(true);
    setMessage(null);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    if (role === "ATTORNEY") {
      window.location.href = "/attorney/onboarding";
    } else {
      setMessage({ type: "success", text: "Account created! Check your inbox if email confirmation is enabled." });
    }
  };

  const handleSubmit = (e: FormEvent) => {
    if (role === "ADMIN" && mode === "signup") {
      e.preventDefault();
      setMessage({ type: "error", text: "管理员账号不开放注册，请使用登录。" });
      return;
    }
    if (mode === "signin") {
      void onSignIn(e);
    } else {
      e.preventDefault();
      void onSignUp();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-16">
      {/* Back to home */}
      <div className="absolute top-6 left-6">
        <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
          <span>←</span> 返回首页 / Home
        </Link>
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 justify-center">
            <div className="h-10 w-10 bg-amber-600 rounded-xl flex items-center justify-center">
              <ScalesIcon className="h-6 w-6 text-white" />
            </div>
            <div className="text-left">
              <div className="text-white font-bold text-base leading-tight">美国华人119找律师网</div>
              <div className="text-amber-400 text-xs font-semibold tracking-wider">Law119</div>
            </div>
          </Link>
        </div>

        {/* Role Selector */}
        <div className="flex gap-1 bg-slate-800/60 p-1 rounded-xl mb-6 border border-slate-700/50">
          {([
            { key: "CLIENT" as Role, label: "I Need Legal Help", zh: "我需要法律帮助", icon: "👤" },
            { key: "ATTORNEY" as Role, label: "I'm an Attorney", zh: "我是律师", icon: "⚖️" },
            { key: "ADMIN" as Role, label: "Admin Portal", zh: "后台管理", icon: "🛡️" },
          ] as const).map((r) => (
            <button
              key={r.key}
              onClick={() => {
                setRole(r.key);
                if (r.key === "ADMIN") setMode("signin");
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
                role === r.key
                  ? "bg-amber-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>{r.icon}</span>
              <span className="hidden sm:block">{r.label}</span>
              <span className="sm:hidden">{r.zh}</span>
            </button>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Card Header */}
          <div className="bg-slate-900 px-6 py-5">
            <h1 className="text-white font-bold text-lg">
              {mode === "signin" ? "Sign In / 登录" : "Create Account / 注册"}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {headerSubtitle}
            </p>
          </div>

          {/* Card Body */}
          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Email Address / 电子邮件
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Password / 密码
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 pr-11 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <SpinnerIcon className="h-4 w-4 animate-spin" />
                  Please wait... / 请稍候
                </>
              ) : mode === "signin" ? (
                "Sign In / 登录"
              ) : (
                "Create Account / 注册"
              )}
            </button>

            {/* Mode toggle */}
            <p className="text-center text-sm text-slate-500">
              {role === "ADMIN"
                ? "管理员账号由系统创建，不支持前台注册。"
                : mode === "signin"
                  ? "Don't have an account?"
                  : "Already have an account?"}
              {" "}
              {role !== "ADMIN" && (
                <button
                  type="button"
                  onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
                  className="text-amber-600 font-semibold hover:text-amber-500 transition-colors"
                >
                  {mode === "signin" ? "Sign Up / 注册" : "Sign In / 登录"}
                </button>
              )}
            </p>

            {/* Message */}
            {message && (
              <div
                className={`rounded-lg px-4 py-3 text-sm ${
                  message.type === "error"
                    ? "bg-rose-50 border border-rose-200 text-rose-800"
                    : "bg-emerald-50 border border-emerald-200 text-emerald-800"
                }`}
              >
                {message.text}
              </div>
            )}
          </form>

          {/* Card Footer */}
          <div className="px-6 pb-6 pt-0 space-y-3 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheckIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <span>Secured by Supabase · Your data is encrypted end-to-end</span>
            </div>

            {role === "ATTORNEY" && mode === "signup" && (
              <p className="text-xs text-slate-500 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-5">
                After creating your account, you will complete bar verification and profile setup before accessing the attorney dashboard.
                <span className="block text-slate-400 mt-1">注册后需完成律师执照验证和资料填写，才能访问律师仪表盘。</span>
              </p>
            )}
          </div>
        </div>

        {/* Bottom disclaimer */}
        <p className="text-center text-xs text-slate-500 mt-6 leading-5">
          By signing in, you agree that this platform does not constitute legal advice.
          <br />
          登录即表示您了解本平台不提供法律建议。
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <SpinnerIcon className="h-8 w-8 text-amber-500 animate-spin" />
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}
