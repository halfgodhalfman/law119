import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";
import { Footer } from "@/components/ui/footer";

export default function PrivacyPage() {
  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <h1 className="text-3xl font-bold text-slate-900">Privacy Policy / 隐私政策</h1>
          <p className="mt-2 text-sm text-slate-500">最后更新 / Last updated: 2025年1月</p>

          <div className="mt-6 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700">

            {/* Section 1 */}
            <section>
              <h2 className="text-base font-semibold text-slate-900">
                1. 我们收集的信息 / Information We Collect
              </h2>
              <p className="mt-2">我们在您使用本平台时收集以下类别的信息：</p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li><strong>账号信息：</strong>注册时提供的姓名、电子邮件、电话号码及登录凭证。</li>
                <li><strong>案件信息：</strong>您提交的案件类别、所在州、邮编、案情描述、紧急程度及联系方式（匿名提案无需注册）。</li>
                <li><strong>律师资料：</strong>执照号、执业州、专业领域、语言能力及身份证明文件（仅律师用户）。</li>
                <li><strong>沟通记录：</strong>平台内的消息、报价、合同及文件往来记录。</li>
                <li><strong>使用数据：</strong>页面访问、功能使用、设备类型及 IP 地址等日志信息。</li>
                <li><strong>支付信息：</strong>由第三方支付处理商直接处理；平台不存储完整银行卡号。</li>
              </ul>
              <p className="mt-2 text-slate-500 text-xs">
                We collect account info, case details, attorney credentials, communication records, usage logs, and payment metadata (processed by third-party processors; no raw card data stored).
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-base font-semibold text-slate-900">
                2. 如何使用信息 / How We Use Information
              </h2>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>提供核心撮合服务：将案件与符合条件的华人律师匹配。</li>
                <li>身份与执照核验：验证律师执业资格的真实性。</li>
                <li>平台安全与风控：检测欺诈、骚扰及违规行为。</li>
                <li>争议处理与合规审计：保留必要记录以满足监管要求。</li>
                <li>服务改善：分析汇总使用数据以优化功能与用户体验。</li>
                <li>通知与提醒：向您发送关于案件状态、报价及平台更新的通知。</li>
              </ul>
              <p className="mt-2 text-slate-500 text-xs">
                We use your information to provide matching services, verify attorney licenses, ensure platform safety, handle disputes, improve our product, and send relevant notifications.
              </p>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-base font-semibold text-slate-900">
                3. 信息共享 / Information Sharing
              </h2>
              <p className="mt-2">我们<strong>不出售</strong>您的个人信息。我们仅在以下情况下共享信息：</p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li><strong>匹配律师：</strong>案件类别、地区及紧急程度等基本信息会向符合条件的律师披露。在您选择律师之前，您的个人联系方式不会对外公开。</li>
                <li><strong>支付处理商：</strong>必要的交易信息由合规第三方支付机构处理。</li>
                <li><strong>法律要求：</strong>在法院命令、传票或适用法律要求时，我们可能依法披露相关信息。</li>
                <li><strong>平台运营商：</strong>我们的技术服务提供商（如云托管、邮件服务）可能在严格保密协议下访问必要数据。</li>
              </ul>
              <p className="mt-2 text-slate-500 text-xs">
                We do not sell your data. We share limited information only with matched attorneys, compliant payment processors, required by law, or with our operational service providers under confidentiality agreements.
              </p>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-base font-semibold text-slate-900">
                4. 加州用户权利（CCPA）/ California Residents' Rights
              </h2>
              <p className="mt-2">
                根据《加州消费者隐私法》（CCPA），加州居民享有以下权利：
              </p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li><strong>知情权：</strong>了解我们收集、使用及共享哪些个人信息。</li>
                <li><strong>删除权：</strong>要求删除我们持有的您的个人信息（适用法律例外除外）。</li>
                <li><strong>不歧视权：</strong>行使上述权利不会导致服务差别对待。</li>
                <li><strong>选择退出权：</strong>由于我们不出售个人数据，此项权利自动适用。</li>
              </ul>
              <p className="mt-2">如需行使上述权利，请发送电子邮件至 <a href="mailto:privacy@law119.com" className="text-amber-700 underline">privacy@law119.com</a>，我们将在 45 个工作日内答复。</p>
              <p className="mt-2 text-slate-500 text-xs">
                Under the California Consumer Privacy Act (CCPA), California residents have the right to know, delete, and opt-out regarding their personal information. Contact privacy@law119.com to exercise these rights.
              </p>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-base font-semibold text-slate-900">
                5. 数据安全 / Data Security
              </h2>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>所有传输数据使用 TLS/HTTPS 加密。</li>
                <li>数据库存储采用静态加密（AES-256）。</li>
                <li>律师执照及敏感附件受访问权限控制与下载审计约束。</li>
                <li>内部访问权限遵循最小权限原则，并留有审计日志。</li>
              </ul>
              <p className="mt-2 text-slate-500 text-xs">
                All data in transit is encrypted with TLS/HTTPS. Data at rest uses AES-256 encryption. Access to sensitive materials is controlled and audited.
              </p>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-base font-semibold text-slate-900">
                6. 联系我们 / Contact Us
              </h2>
              <p className="mt-2">
                如有隐私相关问题或请求，请联系：
              </p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>电子邮件 / Email: <a href="mailto:privacy@law119.com" className="text-amber-700 underline">privacy@law119.com</a></li>
                <li>平台名称 / Platform: 美国华人119找律师网 (Law119)</li>
              </ul>
              <p className="mt-2 text-slate-500 text-xs">
                For privacy-related questions or requests, email us at privacy@law119.com. We respond within 45 days.
              </p>
            </section>
          </div>

          {/* Cross-links to other legal pages */}
          <div className="mt-6 flex flex-wrap gap-2 text-sm">
            <Link className="text-amber-700 underline" href="/legal/terms">服务条款 / Terms of Service</Link>
            <Link className="text-amber-700 underline" href="/legal/attorney-terms">律师条款 / Attorney Terms</Link>
            <Link className="text-amber-700 underline" href="/legal/client-terms">用户条款 / Client Terms</Link>
            <Link className="text-amber-700 underline" href="/legal/advertising-disclaimer">广告免责 / Advertising Disclaimer</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
