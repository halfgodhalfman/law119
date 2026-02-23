import { NavBar } from '@/components/ui/nav-bar';

export default function AttorneyTermsPage() {
  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12"><div className="mx-auto max-w-4xl px-4 py-8"><h1 className="text-3xl font-bold text-slate-900">Attorney Terms / 律师端条款</h1><div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700 space-y-4"><p>律师应确保执业资格真实有效，并遵守执业地/州法限制。</p><p>律师在确认委托前需完成基础利益冲突检查并留痕；报价不等于正式代理。</p><p>律师不得承诺胜诉、诱导站外交易、发布虚假资质或骚扰用户。</p></div></div></main>
    </>
  );
}
