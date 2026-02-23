import Link from "next/link";
import { NavBar } from "../../components/ui/nav-bar";
import { Footer } from "../../components/ui/footer";
import { LEGAL_CATEGORIES } from "../../lib/legal-categories";

export const metadata = {
  title: "全部法律服务 | 美国华人119找律师网 Law119",
  description: "浏览美国华人119找律师网全部法律服务分类，包括移民、刑事、家庭、房产、商业等10大类50+细分服务。",
};

export default function ServicesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <NavBar />

      {/* Hero */}
      <div className="bg-slate-900 px-4 py-12 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-400">
          All Services · 全部服务
        </p>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">
          美国华人119找律师网服务目录
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
          10 大类 · 50+ 细分服务 · 全程中文沟通 · 匿名提交
        </p>
        <Link
          href="/case/new"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-500"
        >
          立即提交案件 →
        </Link>
      </div>

      {/* Category grid nav */}
      <div className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-wrap justify-center gap-2">
            {LEGAL_CATEGORIES.map((cat) => (
              <a
                key={cat.key}
                href={`#${cat.key}`}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-amber-400 hover:text-amber-700"
              >
                <span>{cat.emoji}</span>
                {cat.nameZh}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <div className="space-y-14">
          {LEGAL_CATEGORIES.map((cat) => {
            // Group sub-categories by group
            const groups: Record<string, typeof cat.subCategories> = {};
            cat.subCategories.forEach((sub) => {
              if (!groups[sub.group]) groups[sub.group] = [];
              groups[sub.group].push(sub);
            });

            return (
              <section key={cat.key} id={cat.key} className="scroll-mt-20">
                {/* Category header */}
                <div className={`mb-6 flex items-center gap-4 rounded-2xl border p-5 ${cat.color} ${cat.borderColor}`}>
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
                    {cat.emoji}
                  </div>
                  <div>
                    <h2 className={`text-xl font-bold ${cat.textColor}`}>
                      {cat.nameZh}
                      <span className="ml-2 text-sm font-normal opacity-70">{cat.nameEn}</span>
                    </h2>
                    <p className="mt-0.5 text-sm opacity-70">{cat.description}</p>
                  </div>
                  <div className="ml-auto flex-shrink-0">
                    <Link
                      href={`/case/new?category=${cat.key}`}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700"
                    >
                      提交此类案件 →
                    </Link>
                  </div>
                </div>

                {/* Sub-category groups */}
                <div className="space-y-6">
                  {Object.entries(groups).map(([groupName, subs]) => (
                    <div key={groupName}>
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-500">
                        <span className="h-px flex-1 bg-slate-200" />
                        {groupName}
                        <span className="h-px flex-1 bg-slate-200" />
                      </h3>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                        {subs.map((sub) => (
                          <Link
                            key={sub.slug}
                            href={`/case/new?category=${cat.key}`}
                            className="group relative flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:border-amber-400 hover:shadow-md"
                          >
                            {sub.hot && (
                              <span className="absolute right-2 top-2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                                热门
                              </span>
                            )}
                            <p className="text-sm font-semibold text-slate-900 group-hover:text-amber-700 leading-tight">
                              {sub.nameZh}
                            </p>
                            <p className="text-[10px] text-slate-400 leading-tight">{sub.nameEn}</p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      {/* Bottom CTA */}
      <div className="bg-slate-900 py-12 text-center">
        <h2 className="text-xl font-bold text-white">找不到您的问题类型？</h2>
        <p className="mt-2 text-sm text-slate-400">
          选择"其他专项"提交，律师会帮您评估案情。
        </p>
        <Link
          href="/case/new"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-500"
        >
          免费提交案件咨询 →
        </Link>
      </div>

      <Footer />
    </div>
  );
}
