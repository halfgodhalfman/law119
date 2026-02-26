import Link from "next/link";
import { ScalesIcon } from "./icons";

export function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-8 w-8 bg-amber-600 rounded-lg flex items-center justify-center">
                <ScalesIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-white font-bold text-sm">美国华人119找律师网</span>
                <span className="text-amber-400 text-xs ml-1.5 font-semibold">Law119</span>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-6">
              全美唯一专注华人客户与华人律师精准对接的法律服务撮合平台。
            </p>
            <p className="text-slate-500 text-xs mt-2 leading-5">
              有法律问题，找119
            </p>
            <div className="mt-4 flex items-center gap-1.5 bg-rose-900/30 border border-rose-800/50 rounded-lg px-3 py-2">
              <span className="h-1.5 w-1.5 bg-rose-500 rounded-full animate-pulse flex-shrink-0" />
              <Link href="/emergency" className="text-rose-400 text-xs font-medium hover:text-rose-300 transition-colors">
                🚨 24小时紧急法律求助
              </Link>
            </div>
          </div>

          {/* For Clients */}
          <div>
            <h3 className="text-white text-sm font-semibold mb-4 uppercase tracking-wide">
              客户服务
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/case/new" className="text-slate-400 hover:text-white text-sm transition-colors">
                  发布案件
                </Link>
              </li>
              <li>
                <Link href="/services" className="text-slate-400 hover:text-white text-sm transition-colors">
                  全部法律服务
                </Link>
              </li>
              <li>
                <Link href="/emergency" className="text-slate-400 hover:text-white text-sm transition-colors">
                  紧急法律救援
                </Link>
              </li>
              <li>
                <Link href="/auth/sign-in?role=client" className="text-slate-400 hover:text-white text-sm transition-colors">
                  客户登录
                </Link>
              </li>
            </ul>
          </div>

          {/* For Attorneys */}
          <div>
            <h3 className="text-white text-sm font-semibold mb-4 uppercase tracking-wide">
              律师入驻
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/for-attorneys" className="text-slate-400 hover:text-white text-sm transition-colors">
                  为什么加入华人119找律师网
                </Link>
              </li>
              <li>
                <Link href="/attorney/onboarding" className="text-slate-400 hover:text-white text-sm transition-colors">
                  申请入驻
                </Link>
              </li>
              <li>
                <Link href="/auth/sign-in?role=attorney" className="text-slate-400 hover:text-white text-sm transition-colors">
                  律师登录
                </Link>
              </li>
              <li>
                <Link href="/attorney/dashboard" className="text-slate-400 hover:text-white text-sm transition-colors">
                  律师工作台
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-white text-sm font-semibold mb-4 uppercase tracking-wide">
              平台信息
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/about" className="text-slate-400 hover:text-white text-sm transition-colors">
                  关于我们
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="text-slate-400 hover:text-white text-sm transition-colors">隐私政策</Link>
              </li>
              <li>
                <Link href="/legal/terms" className="text-slate-400 hover:text-white text-sm transition-colors">服务条款</Link>
              </li>
              <li>
                <Link href="/legal/attorney-terms" className="text-slate-400 hover:text-white text-sm transition-colors">律师职业道德声明</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border-t border-slate-800 pt-8">
          <p className="text-slate-500 text-xs leading-5 mb-2">
            <strong className="text-slate-400">Legal Disclaimer:</strong> Law119 (美国华人119找律师网) is not a law firm and does not
            provide legal advice. Use of this platform does not create an attorney-client relationship. All
            attorneys are independent practitioners solely responsible for their own representations.
            Bar license verification is performed on a best-efforts basis. Results are not guaranteed.
          </p>
          <p className="text-slate-600 text-xs leading-5">
            <strong className="text-slate-500">免责声明：</strong>美国华人119找律师网不是律师事务所，不提供法律建议，不保证案件结果。使用本平台不构成律师-客户关系。所有律师均为独立执业者，对其法律代理行为独立负责。律师执照验证基于最大努力原则。平台仅提供信息撮合服务。
          </p>
          <p className="text-slate-600 text-xs mt-4">
            © {new Date().getFullYear()} Law119 (美国华人119找律师网). All rights reserved. · 保留所有权利
          </p>
        </div>
      </div>
    </footer>
  );
}
