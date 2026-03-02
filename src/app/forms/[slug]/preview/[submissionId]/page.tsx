"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { NavBar } from "@/components/ui/nav-bar";

interface SubmissionData {
  id: string;
  createdAt: string;
  expiresAt: string;
  template: {
    slug: string;
    title: string;
    titleZh: string;
    disclaimer?: string;
    disclaimerZh?: string;
  };
  formData: Record<string, string>;
  renderedHtml: string;
}

// 文书打印 CSS（仅包含布局样式，无脚本）
const PRINT_STYLES = `
  body { font-family: 'Times New Roman', Times, serif; color: #000; background: #fff; margin: 0; padding: 40px; line-height: 1.6; }
  h1 { font-size: 20px; text-align: center; margin-bottom: 4px; }
  h1 .zh { font-size: 16px; display: block; }
  h2 { font-size: 15px; margin-top: 20px; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  h3 { font-size: 13px; margin-bottom: 6px; }
  p { margin: 8px 0; font-size: 13px; }
  .doc-header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #000; padding-bottom: 16px; }
  .doc-date { font-size: 12px; color: #555; margin-top: 4px; }
  .party-block { border: 1px solid #ddd; padding: 12px 16px; border-radius: 4px; margin: 12px 0; background: #fafafa; }
  .doc-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
  .doc-table td { border: 1px solid #ccc; padding: 6px 10px; }
  .doc-table td:first-child { background: #f5f5f5; font-weight: bold; width: 40%; }
  .signature-section { display: flex; gap: 40px; margin-top: 40px; }
  .sig-block { flex: 1; }
  .sig-line { border-bottom: 1px solid #000; height: 30px; margin-bottom: 8px; }
  blockquote { border-left: 3px solid #ccc; margin: 12px 0; padding: 8px 16px; background: #f9f9f9; font-style: italic; font-size: 12px; }
  .letter-date { text-align: right; font-size: 13px; }
  @media print {
    body { margin: 0; padding: 20px; }
    .no-print { display: none !important; }
  }
`;

export default function FormPreviewPage() {
  const params = useParams();
  const submissionId = params.submissionId as string;
  const slug = params.slug as string;

  // 修复 #16: 不再从 URL query param 读取 Session Key
  // Session Key 通过 sessionStorage 传递（不出现在 URL、历史记录、Referer 头中）
  const [sk, setSk] = useState<string>("");
  const [data, setData] = useState<SubmissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 修复 #9/#11: 客户端 DOMPurify 二次净化（服务端已 sanitizeHtml，这里是纵深防御）
  // 动态 import 避免 SSR 时 DOMPurify 访问 window/document 报错
  const [safeHtml, setSafeHtml] = useState<string>("");

  useEffect(() => {
    // 从 sessionStorage 读取 session key（上个页面在提交后写入）
    const storedSk = sessionStorage.getItem(`form_sk_${submissionId}`) ?? "";
    setSk(storedSk);
  }, [submissionId]);

  useEffect(() => {
    if (sk === "" && !sessionStorage.getItem(`form_sk_${submissionId}`) && !loading) return;

    const load = async () => {
      try {
        // 修复 #16: Session Key 改为通过请求头传输，不再放在 URL
        const res = await fetch(
          `/api/marketplace/forms/submissions/${submissionId}`,
          {
            headers: sk ? { "X-Session-Key": sk } : {},
          }
        );
        const json = await res.json();
        if (!json.ok) throw new Error(json.error ?? "加载失败");
        setData(json.submission);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载文书时发生错误");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [submissionId, sk]);

  // 修复 #9/#11: 数据加载后，在客户端用 DOMPurify 做二次净化
  // 即使服务端已 sanitizeHtml()，客户端再净化一次是纵深防御的标准做法
  useEffect(() => {
    if (!data?.renderedHtml) return;
    // 动态 import DOMPurify（仅在浏览器端运行，避免 SSR 报错）
    import("dompurify").then((mod) => {
      const DOMPurify = mod.default;
      const clean = DOMPurify.sanitize(data.renderedHtml, {
        // 允许法律文书所需的排版标签，禁止所有脚本和事件属性
        ALLOWED_TAGS: [
          "h1","h2","h3","h4","p","ul","ol","li",
          "strong","b","em","i","u","s",
          "table","thead","tbody","tr","td","th",
          "br","div","span","hr","pre","blockquote",
          "a","code",
        ],
        ALLOWED_ATTR: ["style","class","colspan","rowspan","href","target","rel"],
        // 强制 href 只允许安全协议
        ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
        // 禁止 data-uri 和 javascript: 伪协议
        FORBID_TAGS: ["script","iframe","object","embed","form","input","button"],
        FORBID_ATTR: ["onerror","onload","onclick","onmouseover","onfocus","onblur"],
        FORCE_BODY: true,
      });
      setSafeHtml(clean);
    }).catch(() => {
      // DOMPurify 加载失败时回退到服务端已净化的 HTML（已有双重服务端保护）
      setSafeHtml(data.renderedHtml);
    });
  }, [data?.renderedHtml]);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow || !data) return;
    // 修复 #9/#11: 使用经过客户端 DOMPurify 净化的 safeHtml（非原始 renderedHtml）
    // safeHtml 已经过：1) 服务端 sanitizeHtml() + renderSafeTemplate()；2) 客户端 DOMPurify
    const htmlToPrint = safeHtml || data.renderedHtml; // 降级兜底：DOMPurify 未完成时用服务端结果
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
        <title>${data.template.titleZh}</title>
        <style>${PRINT_STYLES}</style>
      </head>
      <body>
        ${htmlToPrint}
        <div style="margin-top:40px;border-top:1px dashed #ccc;padding-top:12px;font-size:10px;color:#999;text-align:center;">
          Generated by Law119.com · 由美国华人119找律师网生成 · ${new Date(data.createdAt).toLocaleDateString("zh-CN")}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error ?? "文书记录未找到"}</p>
          <Link href={`/forms/${slug}`} className="text-amber-400 hover:text-amber-300 underline">
            重新填写
          </Link>
        </div>
      </div>
    );
  }

  const expiresDate = new Date(data.expiresAt).toLocaleDateString("zh-CN");

  const SLUG_TO_CATEGORY: Record<string, string> = {
    "vehicle-bill-of-sale": "CIVIL",
    "promissory-note": "CIVIL",
    "demand-letter-payment": "CIVIL",
    "lease-termination-notice": "REAL_ESTATE",
    "non-disclosure-agreement": "BUSINESS",
    "simple-will": "FAMILY",
    "residential-lease-agreement": "REAL_ESTATE",
    "llc-operating-agreement": "BUSINESS",
    "employment-agreement": "LABOR",
  };
  const reviewCategory = SLUG_TO_CATEGORY[slug] ?? "CIVIL";
  const reviewTitle = `律师审核文书：${data.template.titleZh}`;
  const reviewDescription = `您好，我通过 Law119 网站的自助工具生成了一份「${data.template.titleZh}」，希望委托律师专业审阅，确认条款是否完整、是否符合我所在州的法律规定，并提供修改建议。文书参考编号：${submissionId}`;
  const reviewUrl = `/case/new?category=${reviewCategory}&title=${encodeURIComponent(reviewTitle)}&description=${encodeURIComponent(reviewDescription)}`;

  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* 顶部操作栏 */}
          <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <Link href="/forms" className="hover:text-amber-400">法律文书</Link>
                <span>/</span>
                <Link href={`/forms/${slug}`} className="hover:text-amber-400">{data.template.titleZh}</Link>
                <span>/</span>
                <span>预览</span>
              </div>
              <h1 className="text-lg font-bold text-white">{data.template.titleZh} — 文书预览</h1>
              <p className="text-slate-500 text-xs mt-0.5">
                文书将于 {expiresDate} 到期失效，请尽快下载保存
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/forms/${slug}`}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors"
              >
                重新填写
              </Link>
              <button
                onClick={handlePrint}
                className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
              >
                🖨️ 打印 / 下载 PDF
              </button>
            </div>
          </div>

          {/* 成功提示 */}
          <div className="bg-green-900/20 border border-green-600/30 rounded-xl p-4 mb-6 flex items-start gap-3">
            <span className="text-green-400 text-lg flex-shrink-0">✓</span>
            <div>
              <p className="text-green-400 font-medium text-sm">文书已生成！</p>
              <p className="text-slate-400 text-xs mt-1">
                点击「打印 / 下载 PDF」，在弹出窗口中选择「另存为 PDF」即可保存电子版；
                打印后双方签名即具法律效力。
              </p>
            </div>
          </div>

          {/* 文书预览 — 修复 #9/#11: 服务端 sanitizeHtml() + 客户端 DOMPurify 双重净化 */}
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden mb-6">
            <div className="bg-gray-100 border-b border-gray-200 px-6 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <span className="text-gray-600 text-xs ml-2 font-medium">{data.template.titleZh} — 预览</span>
            </div>
            <div className="p-8">
              {/* PRINT_STYLES 是平台定义的静态 CSS，不含用户输入，可安全渲染 */}
              <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />
              {/*
                safeHtml 经过双重净化：
                1. 服务端：sanitizeHtml() 移除危险标签 + renderSafeTemplate() 转义所有用户输入
                2. 客户端：DOMPurify.sanitize() 二次过滤（纵深防御）
                DOMPurify 加载期间显示加载占位，避免闪烁显示未净化内容。
              */}
              {safeHtml
                ? <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
                : <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-5/6" />
                  </div>
              }
            </div>
          </div>

          {/* 免责声明 */}
          <div className="bg-slate-800/50 border border-slate-600/30 rounded-xl p-4 mb-8">
            <p className="text-slate-500 text-xs leading-relaxed">
              ⚠️ {data.template.disclaimerZh ?? "本文书模板仅供参考，不构成法律建议。"}
            </p>
          </div>

          {/* 律师审核服务 CTA */}
          <div className="rounded-xl overflow-hidden border border-amber-600/30">
            <div className="bg-gradient-to-r from-amber-900/60 to-slate-800 px-5 py-4 flex items-center gap-3">
              <span className="text-2xl">⚖️</span>
              <div>
                <p className="text-white font-semibold text-sm">律师审核服务 · Attorney Review</p>
                <p className="text-amber-300/80 text-xs">平台认证律师，专业审阅您的{data.template.titleZh}</p>
              </div>
            </div>
            <div className="bg-slate-800/80 px-5 py-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <p className="text-amber-400 text-lg mb-1">🔍</p>
                  <p className="text-white text-xs font-medium">逐条审阅文书</p>
                  <p className="text-slate-400 text-xs mt-0.5">识别潜在法律风险</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <p className="text-amber-400 text-lg mb-1">✏️</p>
                  <p className="text-white text-xs font-medium">提供修改建议</p>
                  <p className="text-slate-400 text-xs mt-0.5">补充缺失的保护条款</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <p className="text-amber-400 text-lg mb-1">💬</p>
                  <p className="text-white text-xs font-medium">中文沟通解答</p>
                  <p className="text-slate-400 text-xs mt-0.5">无语言障碍</p>
                </div>
              </div>
              <div className="bg-amber-900/20 border border-amber-600/20 rounded-lg px-4 py-2.5 mb-5 flex gap-2">
                <span className="text-amber-400 flex-shrink-0 text-sm">💡</span>
                <p className="text-amber-200/70 text-xs leading-relaxed">
                  DIY 文书无法涵盖所有个人情况。律师审核可帮您规避漏洞，尤其适用于
                  <strong className="text-amber-300/90">高价值交易、复杂家庭关系或涉诉风险</strong>的情形。
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/qa"
                  className="flex-1 px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors text-center"
                >
                  💬 免费提问律师
                </Link>
                <Link
                  href={reviewUrl}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold transition-colors text-center"
                >
                  委托律师专业审阅 →
                </Link>
              </div>
              <p className="text-slate-500 text-xs text-center mt-3">
                发布需求 → 收到律师报价 → 按需选择 · 全程中文服务
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
