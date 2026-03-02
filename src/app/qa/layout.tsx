import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "免费法律问答 | Law119",
    template: "%s | 法律问答 | Law119",
  },
  description:
    "华人法律问答社区。移民、刑事、家庭、房产、劳工等真实法律问题，由专业认证律师免费解答。",
  openGraph: {
    siteName: "Law119 华人法律问答",
    type: "website",
  },
};

export default function QaLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Law119 免费法律问答社区",
    description: "华人法律问答，专业律师免费解答",
    url: "https://www.law119.com/qa",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://www.law119.com/qa?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
