import Link from "next/link";
import { NavBar } from "../../../components/ui/nav-bar";
import { AttorneyTabs } from "../../../components/attorney/attorney-tabs";
import { requireAuthContext } from "../../../lib/auth-context";
import { LockClosedIcon } from "../../../components/ui/icons";
import { AttorneyNotificationPreferencesPanel } from "@/components/attorney/notification-preferences-panel";

export default async function AttorneySettingsPage() {
  const auth = await requireAuthContext().catch(() => null);
  if (!auth || auth.role !== "ATTORNEY") {
    return (
      <>
        <NavBar />
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
            <LockClosedIcon className="mx-auto h-8 w-8 text-rose-600" />
            <p className="mt-3 text-sm text-slate-700">请以律师身份登录后访问设置。</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <AttorneyTabs />
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">设置（通知、模板、偏好）</h1>
            <p className="mt-2 text-sm text-slate-500">
              该页面作为律师端设置入口占位，下一步建议在此整合：通知偏好、报价模板、推荐筛选偏好、免打扰时段。
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link href="/marketplace/notifications" className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                <p className="text-sm font-semibold text-slate-900">通知中心</p>
                <p className="mt-1 text-xs text-slate-500">站内通知、案件提醒、系统消息</p>
              </Link>
              <Link href="/marketplace/case-hall?sort=recommended" className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                <p className="text-sm font-semibold text-slate-900">推荐偏好（临时）</p>
                <p className="mt-1 text-xs text-slate-500">在案件大厅保存常用推荐筛选方案</p>
              </Link>
              <Link href="/marketplace/my-bids" className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                <p className="text-sm font-semibold text-slate-900">报价模板与版本</p>
                <p className="mt-1 text-xs text-slate-500">通过报价历史/版本恢复提高效率</p>
              </Link>
              <Link href="/attorney/bid-templates" className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                <p className="text-sm font-semibold text-slate-900">预报价模板系统（MVP）</p>
                <p className="mt-1 text-xs text-slate-500">按类目维护常用报价模板，一键复制使用</p>
              </Link>
              <Link href="/attorney/onboarding" className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                <p className="text-sm font-semibold text-slate-900">律师档案与信任信息</p>
                <p className="mt-1 text-xs text-slate-500">资质、服务区域、专长、品牌信息</p>
              </Link>
            </div>
          </div>
          <div className="mt-6">
            <AttorneyNotificationPreferencesPanel />
          </div>
        </div>
      </main>
    </>
  );
}
