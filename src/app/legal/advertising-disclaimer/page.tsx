import { NavBar } from '@/components/ui/nav-bar';

export default function AdvertisingDisclaimerPage() {
  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12"><div className="mx-auto max-w-4xl px-4 py-8"><h1 className="text-3xl font-bold text-slate-900">Advertising & Recommendation Disclaimer / 广告与推荐免责声明</h1><div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700 space-y-4"><p>平台展示的推荐排序、律师资料、响应速度或标签仅用于信息呈现与撮合效率优化，不构成对服务质量、法律结果或胜诉概率的承诺。</p><p>平台不得使用“保证胜诉”“内部关系”等误导性宣传。发现此类内容将触发风控处理。</p><p>推荐逻辑可能综合类目匹配、执业地匹配、响应时效、历史行为与风控信号。</p></div></div></main>
    </>
  );
}
