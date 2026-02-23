import { NavBar } from '@/components/ui/nav-bar';

export default function ClientTermsPage() {
  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12"><div className="mx-auto max-w-4xl px-4 py-8"><h1 className="text-3xl font-bold text-slate-900">Client Terms / 用户端条款</h1><div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700 space-y-4"><p>用户需提供真实、合法、必要的案件信息，不得上传伪造材料或提出违法需求。</p><p>在双方完成委托确认单并激活前，会话沟通不当然构成正式律师-客户关系。</p><p>用户可通过举报与争议工单系统请求平台介入处理。</p></div></div></main>
    </>
  );
}
