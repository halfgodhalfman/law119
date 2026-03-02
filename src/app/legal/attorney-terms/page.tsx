import { NavBar } from '@/components/ui/nav-bar';
import Link from 'next/link';

export default function AttorneyTermsPage() {
  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-50 pb-12">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <h1 className="text-3xl font-bold text-slate-900">Attorney Terms / 律师端服务条款</h1>
          <p className="mt-2 text-sm text-slate-500">Last Updated: March 2026 · 最后更新：2026年3月</p>
          <p className="mt-3 text-sm text-slate-600">
            以下条款适用于所有在 Law119 平台注册的执业律师。注册并使用平台服务即表示您接受这些条款。
          </p>

          <div className="mt-6 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700">

            <section>
              <h2 className="font-semibold text-slate-900 text-base mb-2">1. 执业资格与合规 / License &amp; Compliance</h2>
              <p>
                律师须确保在平台登记的执业资格（州别、执照号、姓名）真实有效，且在执业州处于良好状态（active/good standing）。
                律师不得在无执业资格的州或法律领域提供服务。如执照状态发生变化（暂停、吊销、转移州别），须在 48 小时内通知平台或更新资料。
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-slate-900 text-base mb-2">2. 利益冲突 / Conflict of Interest</h2>
              <p>
                律师在正式接受任何委托前，须按照所在州律师行规完成利益冲突核查，并在平台系统中勾选确认。
                报价（Bid）不代表正式代理关系，委托确认书（Engagement Letter）经双方签署后方构成正式委托。
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-slate-900 text-base mb-2">3. 独立执业 / Independent Practice</h2>
              <p>
                律师在平台上以独立执业者身份提供服务，<strong>不是 Law119 的雇员、代理人或合伙人</strong>。
                律师独立对其所有法律意见、代理行为和文书工作承担全部职业责任。
                平台不对律师的执业行为提供担保、背书或承担连带责任。
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-slate-900 text-base mb-2">4. Stripe Connect 收款设置 / Payment Account</h2>
              <p>
                律师须在接受委托前完成 Stripe Connect Express 账户注册，以确保客户付款可通过平台安全到账。
                未完成 Stripe 账户设置的律师不得接受付费委托。
                律师对其 Stripe 账户的安全性和合规性负责，须确保银行账户信息准确有效。
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-slate-900 text-base mb-2">5. 转介绍费合规 / Referral Fee Compliance</h2>
              <p>
                律师如需通过平台安排律师间转介绍费，须遵守 ABA Model Rule 1.5(e) 及所在州律师行规，包括：
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>向客户书面披露转介绍费安排；</li>
                <li>转介绍费为律师间安排，<strong>不增加客户的总费用</strong>；</li>
                <li>百分比转介绍费不得超过律师费总额的 <strong>33%</strong>；</li>
                <li>平台提供的电子委托协议（Engagement Letter）中自动包含转介绍费披露条款。</li>
              </ul>
            </section>

            {/* Layer 9 — 关键禁止行为 */}
            <section>
              <h2 className="font-semibold text-slate-900 text-base mb-2">6. 禁止行为 / Prohibited Conduct</h2>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="font-semibold text-red-900 mb-3">以下行为被严格禁止，违者可被立即暂停或永久封禁账号：</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold flex-shrink-0">❌</span>
                    <span><strong>承诺胜诉或保证结果</strong>：禁止以任何形式向客户承诺案件结果、胜诉率或特定法律结论。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold flex-shrink-0">❌</span>
                    <span><strong>价格统一或接受推荐价格约束</strong>：律师独立设定服务报价，平台提供的历史价格参考数据不具约束力，不构成推荐定价或行业标准。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold flex-shrink-0">❌</span>
                    <span><strong>参与客户收费谈判</strong>：律师不得要求平台代表律师与客户谈判收费，亦不得声称平台对收费安排负责。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold flex-shrink-0">❌</span>
                    <span><strong>代客户签署合同或协议</strong>：律师不得以客户名义签署任何文件，包括委托确认书、诉讼文件或和解协议，除非获得客户明确书面授权。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold flex-shrink-0">❌</span>
                    <span><strong>控制或代管客户资金账户</strong>：禁止律师控制、持有或代管客户的银行账户、投资账户或其他资产账户。律师收款须通过 Stripe Connect 子账户进行。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold flex-shrink-0">❌</span>
                    <span><strong>绕开平台支付系统站外交易</strong>：禁止在平台外与客户直接交换资金、收取现金或使用第三方转账工具替代平台支付系统，即便客户主动要求。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold flex-shrink-0">❌</span>
                    <span><strong>发布虚假资质或误导性信息</strong>：禁止在档案中发布虚假执照信息、夸大执业经验、捏造成功案例或发布无法核实的客户评价。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold flex-shrink-0">❌</span>
                    <span><strong>骚扰或不当联系用户</strong>：禁止在平台外主动联系客户进行招揽，禁止发送垃圾信息或骚扰信息。</span>
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="font-semibold text-slate-900 text-base mb-2">7. 条款变更 / Updates</h2>
              <p>
                平台保留随时修订本律师条款的权利，重大变更将提前 14 天通过邮件或站内通知告知。
                变更生效后继续使用平台即表示接受修订内容。如不接受，律师可通过账户设置注销账号。
              </p>
            </section>

          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-sm">
            <Link className="underline" href="/legal/terms">Terms of Service</Link>
            <Link className="underline" href="/legal/client-terms">Client Terms</Link>
            <Link className="underline" href="/legal/advertising-disclaimer">Advertising Disclaimer</Link>
          </div>
        </div>
      </main>
    </>
  );
}
