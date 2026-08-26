import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "About — GoTogether",
};

const VALUES = [
  {
    icon: "🛡️",
    title: "Trust before convenience.",
    body: "Every traveller verifies their phone, email, and ID before they can create or join a trip. We'd rather ask more of you upfront than leave you guessing who you're travelling with.",
  },
  {
    icon: "🔍",
    title: "Real information, your judgment.",
    body: "We show you Trust Scores, reviews, and who else is going — but we don't pretend to guarantee how any individual trip will turn out. The decision is always yours.",
  },
  {
    icon: "🤝",
    title: "Built for co-travellers, not strangers.",
    body: "GoTogether exists for one reason: finding people who genuinely want to go where you're going, at a time that works, without compromising on safety or trust.",
  },
];

/**
 * About — static, platform-authored page, following the same structure
 * and tone as app/trust-safety/page.tsx (icon+title+body item list,
 * Section wrapper, closing note). No fabricated company history/team/
 * press claims — kept to product philosophy and what's real about the
 * current product (see Footer's own "currently available for trips
 * starting from Delhi NCR" line, echoed here).
 */
export default function AboutPage() {
  return (
    <>
      <Header activePath="/about" />
      <main className="flex-1 bg-surface">
        <div className="mx-auto max-w-[720px] px-8 py-11 pb-20 max-[599px]:px-4">
          <h1 className="mb-2.5 font-display text-[30px] font-bold">About GoTogether</h1>
          <p className="mb-1 max-w-[580px] text-sm leading-relaxed text-text-tertiary">
            A trust-first community for finding real travel companions — people to actually go
            somewhere with, not just people to follow online.
          </p>

          <Section title="Why we started" topPad>
            <p className="text-[12.5px] leading-relaxed text-text-secondary">
              Most trips don&apos;t fall apart because of the destination — they fall apart because
              the group never quite comes together. Someone can&apos;t find travel companions who
              share their dates, their budget, or their pace. GoTogether exists to solve that one
              problem well: helping real people build a trustworthy group and actually go.
            </p>
          </Section>

          <Section title="What we believe">
            {VALUES.map((item) => (
              <ValueItem key={item.title} {...item} />
            ))}
          </Section>

          <Section title="Where we are today">
            <p className="text-[12.5px] leading-relaxed text-text-secondary">
              GoTogether is currently available for trips starting from Delhi NCR, with community
              trips organized by verified individuals alongside trips run by Verified Partner travel
              companies. We&apos;re building carefully, one trustworthy trip at a time, before
              expanding further.
            </p>
          </Section>

          <div className="mt-2 rounded-2xl bg-surface-tint px-6.5 py-5.5">
            <div className="mb-1.5 text-sm font-bold">Have a question or idea for us?</div>
            <p className="text-[12.5px] leading-relaxed text-text-secondary">
              We&apos;d like to hear it. Visit{" "}
              <a href="/help" className="font-semibold text-primary hover:underline">
                Help &amp; Support
              </a>{" "}
              to get in touch.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Section({
  title,
  topPad = false,
  children,
}: {
  title: string;
  topPad?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`border-b border-border-divider py-7 ${topPad ? "pt-8" : ""}`}>
      <h2 className="mb-3 font-display text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function ValueItem({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="mb-3.5 flex items-start gap-3">
      <div
        aria-hidden="true"
        className="flex h-8.5 w-8.5 flex-none items-center justify-center rounded-[10px] bg-[oklch(93%_0.05_255)] text-[15px] text-[oklch(45%_0.16_255)]"
        style={{ width: 34, height: 34 }}
      >
        {icon}
      </div>
      <div>
        <strong className="text-[13px]">{title}</strong>{" "}
        <span className="text-[12.5px] text-text-secondary">{body}</span>
      </div>
    </div>
  );
}
