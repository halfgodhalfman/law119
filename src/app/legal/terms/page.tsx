import { NavBar } from '@/components/ui/nav-bar';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <h1 className="text-3xl font-bold text-slate-900">Terms of Service / 平台服务条款</h1>
          <p className="mt-2 text-sm text-slate-500">Last Updated: March 2026 · 最后更新：2026年3月</p>
          <p className="mt-3 text-sm text-slate-600">
            Law119（美国华人119找律师网）是一家技术平台公司（SaaS），提供法律服务信息撮合、沟通工具与支付技术接口，
            <strong>不是律师事务所，不是中介机构，不构成法律意见提供方</strong>。
            / Law119 is a technology platform (SaaS) providing legal services matching, communication tools, and payment infrastructure.
            <strong> It is NOT a law firm, NOT a referral agency, and does NOT provide legal advice.</strong>
          </p>

          <div className="mt-6 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700">

            {/* 1 */}
            <section>
              <h2 className="font-semibold text-slate-900 text-base mb-2">1. 平台定位 / Platform Nature</h2>
              <p>
                Law119 是一家<strong>技术平台（SaaS）</strong>，不是律师事务所，不是法律中介机构，不提供法律建议，不参与案件代理，不代表任何一方。
                平台提供以下技术工具：案件需求发布系统、律师报价与沟通系统、身份认证与执照核验工具、电子委托协议生成工具、第三方支付技术接口。
              </p>
              <p className="mt-2">
                律师通过平台独立执业，客户自行选择律师，平台不对法律结果作任何保证或承诺。
                正式律师-客户关系以双方签署的委托确认书（Engagement Letter）为准，平台不是该协议的当事方。
              </p>
              <p className="mt-2 text-slate-500 italic">
                Law119 is a SaaS technology platform. Attorneys practice independently. The platform makes no representation as to legal outcomes.
              </p>
            </section>

            {/* 2 */}
            <section>
              <h2 className="font-semibold text-slate-900 text-base mb-2">2. 用户义务 / User Obligations</h2>
              <p>
                用户须遵守适用法律，禁止：发布违法需求、虚假材料、骚扰信息；诱导或尝试绕过平台进行站外交易；
                绕过平台支付系统或私下交换资金；伪造资质、执照或身份信息；以任何方式干扰平台运营或安全机制。
              </p>
            </section>

            {/* 3 */}
            <section>
              <h2 className="font-semibold text-slate-900 text-base mb-2">3. 内容审核与风控 / Content Moderation</h2>
              <p>
                平台可基于举报、自动规则引擎或人工审核，对违规内容进行警告、限制沟通、关闭会话、暂停账号或永久封禁处理。
                平台保留对内容的最终审核权，但对审核时效不做保证。
              </p>
            </section>

            {/* 4 */}
            <section>
              <h2 className="font-semibold text-slate-900 text-base mb-2">4. 责任边界 / Platform Liability</h2>
              <p>
                平台不保证案件结果，不保证律师接单或胜诉，不对律师执业行为承担连带责任，不对因律师服务质量引起的损失负责。
                律师为独立执业者，独立承担其执业行为的全部法律责任。
              </p>
            </section>

            {/* 5 */}
            <section>
              <h2 className="font-semibold text-slate-900 text-base mb-2">5. 争议处理 / Dispute Resolution (Between Users)</h2>
              <p>
                用户之间（客户与律师）发生服务争议时，可通过平台争议工单系统发起投诉。
                平台提供流程协调与规则审查，不替代司法或律师监管机构的救济渠道。
                平台协调结果对双方无强制约束力，仅供参考。
              </p>
            </section>

            {/* 6 */}
            <section>
              <h2 className="font-semibold text-slate-900 text-base mb-2">6. 平台技术服务费 / Platform Technology Service Fee</h2>
              <p>
                平台通过以下方式收取<strong>平台技术服务费（Platform Technology Service Fee）</strong>：
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>每笔交易的服务费率为合同金额的 <strong>5%</strong>（费率可能根据市场变化调整，调整前 30 天通知用户）；</li>
                <li>此费用为<strong>技术服务费</strong>，由客户承担，用于支付平台的支付处理、资金托管、信息安全、纠纷协调等技术基础设施成本；</li>
                <li>此费用<strong>不是律师费抽成（fee splitting）</strong>，不由律师支付，不影响律师报价金额；</li>
                <li>律师亦可选择订阅会员服务（月费/年费）作为平台营收的另一来源，会员费用以届时页面标价为准。</li>
              </ul>
              <p className="mt-2 text-slate-500 italic">
                The 5% Platform Technology Service Fee is charged to the client, not the attorney. This fee covers payment processing, escrow management, dispute coordination, and platform infrastructure. It is not attorney fee splitting.
              </p>
            </section>

            {/* 7 */}
            <section>
              <h2 className="font-semibold text-slate-900 text-base mb-2">7. Stripe 支付处理与资金流 / Payment Processing &amp; Money Flow</h2>
              <p>
                平台使用 <strong>Stripe</strong>（美国 PCI-DSS Level 1 认证支付处理商）处理所有交易。资金流如下：
              </p>
              <ol className="list-decimal pl-5 mt-2 space-y-1">
                <li>客户通过 Stripe 付款（信用卡/借记卡）；</li>
                <li>资金<strong>直接进入律师的 Stripe Connect 子账户</strong>（托管于 Stripe，而非平台银行账户）；</li>
                <li>平台通过 Stripe Application Fee 机制收取技术服务费，在付款时自动扣除；</li>
                <li>根据里程碑完成情况，资金从 Stripe 子账户转账至律师银行账户；</li>
                <li><strong>平台不持有、不代管客户资金</strong>，不产生信托责任（fiduciary duty）。</li>
              </ol>
              <p className="mt-2 text-slate-500 italic">
                All payments are processed by Stripe. Client funds go directly to the attorney&apos;s Stripe Connect sub-account. Law119 never holds client funds. Platform fees are collected via Stripe Application Fee.
              </p>
            </section>

            {/* 8 */}
            <section>
              <h2 className="font-semibold text-slate-900 text-base mb-2">8. 责任限制 / Limitation of Liability</h2>
              <p>
                在适用法律允许的最大范围内：
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>平台对用户的<strong>总赔偿责任上限</strong>为该用户在索赔事件发生前 12 个月内向平台实际支付的平台技术服务费总额；</li>
                <li>平台不对任何<strong>间接损失、利润损失、数据损失、商誉损失或惩罚性赔偿</strong>负责，无论损失是否可预见；</li>
                <li>平台不对因律师服务质量、执业失误或律师-客户关系引起的损害承担责任。</li>
              </ul>
              <p className="mt-2 text-slate-500 italic">
                Platform liability is capped at 12 months of fees paid. No liability for indirect, incidental, or consequential damages.
              </p>
            </section>

            {/* 9 */}
            <section>
              <h2 className="font-semibold text-slate-900 text-base mb-2">9. 强制仲裁 / Mandatory Arbitration</h2>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="font-semibold text-amber-900 mb-2">⚠ 请仔细阅读 — 此条款影响您解决争议的方式 / PLEASE READ CAREFULLY</p>
                <p>
                  <strong>除第 10 条规定的例外情形外</strong>，您与 Law119 之间因本服务条款或平台服务产生的<strong>任何争议、索赔或纠纷</strong>（包括侵权、消费者保护、隐私及其他法定权利主张），
                  须通过<strong>有约束力的个人仲裁</strong>方式解决，而非通过法院诉讼。
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>仲裁规则</strong>：JAMS Streamlined Arbitration Rules &amp; Procedures（或 AAA 消费者仲裁规则）；</li>
                  <li><strong>仲裁地点</strong>：Delaware 州（可由双方协商以书面/视频方式进行）；</li>
                  <li><strong>语言</strong>：英文为仲裁正式语言；中文版服务条款仅供参考；</li>
                  <li><strong>小额索赔例外</strong>：如争议金额符合小额索赔法院管辖范围，任何一方均可选择提起小额索赔诉讼；</li>
                  <li><strong>费用</strong>：平台承担仲裁机构的案件受理费，双方各自承担律师费；若仲裁裁决认定索赔无实质依据，被裁定方须承担对方合理律师费。</li>
                </ul>
                <p className="mt-2 text-slate-500 italic">
                  Any disputes between you and Law119 must be resolved through binding individual arbitration (JAMS or AAA rules, Delaware venue), not through courts. Small claims court exceptions apply.
                </p>
              </div>
            </section>

            {/* 10 */}
            <section>
              <h2 className="font-semibold text-slate-900 text-base mb-2">10. 集体诉讼豁免 / Class Action Waiver</h2>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="font-semibold text-red-900 mb-2">⚠ 重要权利放弃声明 / IMPORTANT RIGHTS WAIVER</p>
                <p>
                  <strong>您明确放弃以下权利</strong>：以集体诉讼（Class Action）、集体仲裁（Class Arbitration）、私人检察长诉讼（Private Attorney General Action）
                  或任何其他集体代表性形式提起或参与针对 Law119 的诉讼或仲裁程序的权利。
                </p>
                <p className="mt-2">
                  所有争议须以<strong>个人名义</strong>单独提起，不得与其他用户合并为集体诉讼。
                  如因任何原因仲裁庭不能执行本集体诉讼豁免条款，则相关争议须提交有管辖权的法院（不适用仲裁），且法院须以个人诉讼形式审理。
                </p>
                <p className="mt-2 text-slate-500 italic">
                  YOU WAIVE YOUR RIGHT to participate in any class action, class arbitration, or representative proceeding against Law119. All disputes must be brought in your individual capacity only.
                </p>
              </div>
            </section>

            {/* 11 */}
            <section>
              <h2 className="font-semibold text-slate-900 text-base mb-2">11. 管辖法律与语言 / Governing Law &amp; Language</h2>
              <p>
                本服务条款受<strong>美国 Delaware 州法律</strong>管辖，不适用冲突法规则。
                中英双语版本均在本页发布；如中英文内容存在不一致，<strong>以英文版本为准</strong>。
                本条款于用户首次使用平台服务时生效，继续使用平台即表示接受对条款的所有后续修订。
              </p>
              <p className="mt-2 text-slate-500 italic">
                These Terms are governed by Delaware law. In case of conflict, the English version controls. Continued use of the platform constitutes acceptance of any updates.
              </p>
            </section>

          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-sm">
            <Link className="underline" href="/legal/privacy">Privacy Policy</Link>
            <Link className="underline" href="/legal/attorney-terms">Attorney Terms</Link>
            <Link className="underline" href="/legal/client-terms">Client Terms</Link>
            <Link className="underline" href="/legal/advertising-disclaimer">Advertising Disclaimer</Link>
          </div>
        </div>
      </main>
    </>
  );
}
