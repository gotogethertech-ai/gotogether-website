import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Trust & Safety — GoTogether",
};

const BEFORE_YOU_JOIN = [
  {
    icon: "👤",
    title: "Organizer profile.",
    body: "See their Trust Score, verification badges, trips hosted, and response time before requesting to join.",
  },
  {
    icon: "⭐",
    title: "Reviews and travel history.",
    body: "Read what past co-travellers said, and see their completed trip record.",
  },
  {
    icon: "👥",
    title: "Who else is going.",
    body: "Trip Details shows current members and group preferences, so you know who you'd be travelling with.",
  },
];

const WHAT_WE_VERIFY = [
  {
    icon: "✓",
    title: "Identity verification.",
    body: "Individuals verify their phone, email, and a government-issued ID before they can create or join trips.",
  },
  {
    icon: "🏢",
    title: "Verified Partner companies.",
    body: "Travel companies are checked for business registration and GST before earning the Verified Partner badge. This confirms the business is real — it does not guarantee the quality of any specific trip.",
  },
  {
    icon: "📊",
    title: "Trust Score.",
    body: "Built from verified trip history and reviews from real co-travellers — it reflects past behaviour, not a promise about the future.",
  },
];

/**
 * Trust & Safety — a static, platform-authored trust page, per the
 * approved visual spec (no dedicated blueprint document exists for this
 * page; it's built directly from "GoTogether Trust Safety Page.dc.html").
 * Content is verbatim from the design doc — no invented claims.
 */
export default function TrustSafetyPage() {
  return (
    <>
      <Header activePath="/trust-safety" />
      <main className="flex-1 bg-surface">
        <div className="mx-auto max-w-[720px] px-8 py-11 pb-20 max-[599px]:px-4">
          <h1 className="mb-2.5 font-display text-[30px] font-bold">Trust &amp; Safety</h1>
          <p className="mb-1 max-w-[580px] text-sm leading-relaxed text-text-tertiary">
            GoTogether gives you real information to make your own judgment before travelling with
            someone — it doesn&apos;t replace your judgment, and it can&apos;t guarantee how any
            individual trip will go.
          </p>

          <Section id="before-you-join" title="Before you join a trip" topPad>
            {BEFORE_YOU_JOIN.map((item) => (
              <TrustItem key={item.title} {...item} />
            ))}
          </Section>

          <Section id="verification" title="What GoTogether verifies">
            {WHAT_WE_VERIFY.map((item) => (
              <TrustItem key={item.title} {...item} />
            ))}
          </Section>

          <Section id="guidelines" title="What's expected of everyone">
            <p className="text-[12.5px] leading-relaxed text-text-secondary">
              GoTogether works because members treat each other honestly. That means being truthful
              in your profile and trip listings, communicating clearly with your group, showing up
              when you&apos;ve committed to a trip, and leaving honest reviews once it&apos;s over.
            </p>
          </Section>

          <Section id="report" title="If something goes wrong">
            <p className="mb-3.5 text-[12.5px] leading-relaxed text-text-secondary">
              You can report a user, a trip, a message, or a review at any time, and block anyone you
              don&apos;t want to interact with. Our team reviews every report — serious or repeated
              issues can lead to a restriction or suspension of the account involved.
            </p>
            <a href="/help" className="text-[13px] font-semibold text-primary hover:underline">
              Report a problem →
            </a>
          </Section>

          <div className="mt-2 rounded-2xl bg-surface-tint px-6.5 py-5.5">
            <div className="mb-1.5 text-sm font-bold">Use your own judgment</div>
            <p className="text-[12.5px] leading-relaxed text-text-secondary">
              The information on GoTogether is meant to help you decide with more confidence — it
              isn&apos;t a guarantee of anyone&apos;s behaviour or of how a trip will turn out. Trust
              what you see, but also trust your own instincts when meeting people in person.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Section({
  id,
  title,
  topPad = false,
  children,
}: {
  id: string;
  title: string;
  topPad?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`border-b border-border-divider py-7 ${topPad ? "pt-8" : ""}`}>
      <h2 className="mb-3 font-display text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function TrustItem({ icon, title, body }: { icon: string; title: string; body: string }) {
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
