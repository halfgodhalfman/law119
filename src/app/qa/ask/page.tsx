import type { Metadata } from "next";
import { NavBar } from "@/components/ui/nav-bar";
import { Footer } from "@/components/ui/footer";
import { QaQuestionForm } from "@/components/qa/qa-question-form";

export const metadata: Metadata = {
  title: "免费发布法律问题",
  description:
    "无需注册，匿名发布您的法律问题。平台专业律师将免费解答移民、刑事、家庭、房产等各类法律问题。",
  alternates: { canonical: "https://www.law119.com/qa/ask" },
};

export default function QaAskPage() {
  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-900">
        <div className="bg-gradient-to-b from-slate-800 to-slate-900 border-b border-slate-700 py-10">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-2">
              免费法律问答
            </p>
            <h1 className="text-2xl font-bold text-white mb-2">发布法律问题</h1>
            <p className="text-slate-400 text-sm">
              无需注册，匿名发布。专业认证律师将免费解答您的法律疑问。
            </p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* 提示卡片 */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
            <h2 className="text-slate-300 text-sm font-medium mb-2">💡 如何写出好问题？</h2>
            <ul className="text-slate-500 text-xs space-y-1">
              <li>• 简洁明了的标题，包含核心法律问题</li>
              <li>• 详细描述时间、地点、背景和已采取的措施</li>
              <li>• 说明您期望的结果或诉求</li>
              <li>• 不要包含个人敏感信息（如 SSN、完整姓名）</li>
            </ul>
          </div>

          <QaQuestionForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
