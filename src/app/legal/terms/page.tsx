import { NavBar } from '@/components/ui/nav-bar';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <h1 className="text-3xl font-bold text-slate-900">Terms of Service / 平台服务条款</h1>
          <p className="mt-3 text-sm text-slate-600">Law119 提供法律服务信息撮合与沟通工具，不构成律所或法律意见提供方。</p>
          <div className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700">
            <section><h2 className="font-semibold text-slate-900">1. 平台定位</h2><p>平台提供案件发布、律师报价、沟通、风控与运营管理工具；正式代理关系以双方委托确认单及相关协议为准。</p></section>
            <section><h2 className="font-semibold text-slate-900">2. 用户义务</h2><p>禁止发布违法需求、骚扰信息、虚假材料、诱导站外交易或绕过平台风控机制。</p></section>
            <section><h2 className="font-semibold text-slate-900">3. 内容审核与风控</h2><p>平台可基于举报、规则引擎、人工审核对内容进行警告、限制沟通、拉黑、关闭会话或封禁账号处理。</p></section>
            <section><h2 className="font-semibold text-slate-900">4. 责任边界</h2><p>平台不保证案件结果，不保证律师一定接单或胜诉；平台对法律结果不承担承诺责任。</p></section>
            <section><h2 className="font-semibold text-slate-900">5. 争议处理</h2><p>双方可发起争议工单，由平台进行流程协调和规则审查；平台处理不替代司法或监管救济渠道。</p></section>
          </div>
          <div className="mt-6 flex flex-wrap gap-2 text-sm"><Link className="underline" href="/legal/privacy">Privacy</Link><Link className="underline" href="/legal/attorney-terms">Attorney Terms</Link><Link className="underline" href="/legal/client-terms">Client Terms</Link><Link className="underline" href="/legal/advertising-disclaimer">Advertising Disclaimer</Link></div>
        </div>
      </main>
    </>
  );
}
