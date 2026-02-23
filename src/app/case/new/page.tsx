import { NavBar } from "../../../components/ui/nav-bar";
import { CaseMultiStepForm } from "../../../components/case-multi-step-form";
import { LockClosedIcon } from "../../../components/ui/icons";

export default function NewCasePage() {
  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50">
        {/* Page header band */}
        <div className="bg-slate-900 py-10">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 text-amber-400 text-sm mb-3">
              <LockClosedIcon className="h-4 w-4" />
              Anonymous &amp; Secure / 匿名安全
            </div>
            <h1 className="text-2xl font-bold text-white">Post Your Legal Case / 发布法律案件</h1>
            <p className="text-slate-400 text-sm mt-2">
              No personal information required to start. Matched attorneys will contact you.
              <span className="block mt-0.5">无需填写个人信息，匹配律师会主动联系您。</span>
            </p>
          </div>
        </div>

        {/* Form container with negative top margin to overlap header */}
        <div className="max-w-2xl mx-auto px-4 -mt-4 pb-16">
          <CaseMultiStepForm />
        </div>
      </main>
    </>
  );
}
