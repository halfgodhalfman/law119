import { NavBar } from '@/components/ui/nav-bar';

export default function PrivacyPage() {
  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12"><div className="mx-auto max-w-4xl px-4 py-8"><h1 className="text-3xl font-bold text-slate-900">Privacy Policy / 隐私政策</h1><div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700 space-y-4"><p>平台会处理账号信息、案件信息、沟通记录、举报与风控日志、附件访问日志等数据，用于服务提供、风控、争议处理与合规审计。</p><p>敏感证据附件可能被标记为敏感内容，并受附件可见范围控制与下载审计约束。</p><p>平台不会将用户信息用于承诺性法律结果宣传。涉及支付/账单信息时，将依据后续支付规则与处理商协议执行。</p></div></div></main>
    </>
  );
}
