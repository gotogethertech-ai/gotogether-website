import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "How It Works — GoTogether",
};

const STEPS = [
  {
    icon: "🔎",
    title: "Explore trips.",
    body: "Browse community trips organized by verified individuals, or book a seat on a trip run by a Verified Partner travel company. Filter by destination, dates, budget, and who you'd rather travel with.",
  },
  {
    icon: "✓",
    title: "Verify your identity.",
    body: "Before you can create or join a trip, you'll confirm your phone, email, and a government-issued ID. It takes a couple of minutes and is usually reviewed within 24 hours.",
  },
  {
    icon: "✋",
    title: "Request to join.",
    body: "Found a trip you like? Send a request to the organizer. If the trip is full, you're added to the waiting list and promoted automatically as spots open up, in the order you requested.",
  },
  {
    icon: "💬",
    title: "Coordinate as a group.",
    body: "Once you're accepted, you can see who else is going, message the group, and work out the details together before you set off.",
  },
  {
    icon: "⭐",
    title: "Travel, then review.",
    body: "After the trip, leave an honest review for your co-travellers — it's what builds the Trust Score that helps the next person decide who to travel with.",
  },
];

const FOR_ORGANIZERS = [
  {
    icon: "🧭",
    title: "Create a trip.",
    body: "Set your destination, dates, budget, and group size — plus who you're looking to travel with (age range, gender preference) if that matters for your trip.",
  },
  {
    icon: "📋",
    title: "Review who wants to join.",
    body: "See each traveller's profile, verification badges, and Trust Score before accepting them into your group.",
  },
  {
    icon: "👥",
    title: "Manage your group.",
    body: "Accept, waitlist, or decline requests, and keep track of who's confirmed right up until departure.",
  },
];

/**
 * How It Works — static, platform-authored page. Steps reflect the real
 * product flow (Request to Join / waiting-list promotion / Verified
 * Partner "Book Your Spot" — see components/trip/TripActionPanel.tsx),
 * not invented functionality. Same structural conventions as
 * app/trust-safety/page.tsx and app/about/page.tsx.
 */
export default function HowItWorksPage() {
  return (
    <>
      <Header activePath="/how-it-works" />
      <main className="flex-1 bg-surface">
        <div className="mx-auto max-w-[720px] px-8 py-11 pb-20 max-[599px]:px-4">
          <h1 className="mb-2.5 font-display text-[30px] font-bold">How GoTogether works</h1>
          <p className="mb-1 max-w-[580px] text-sm leading-relaxed text-text-tertiary">
            From finding a trip to coming home with a review on your profile — here&apos;s the whole
            path, whether you&apos;re looking to join a trip or organize one.
          </p>

          <Section title="Joining a trip" topPad>
            {STEPS.map((item) => (
              <StepItem key={item.title} {...item} />
            ))}
          </Section>

          <Section title="Organizing a trip">
            {FOR_ORGANIZERS.map((item) => (
              <StepItem key={item.title} {...item} />
            ))}
          </Section>

          <div className="mt-2 rounded-2xl bg-surface-tint px-6.5 py-5.5">
            <div className="mb-1.5 text-sm font-bold">Ready to find your trip?</div>
            <p className="mb-3 text-[12.5px] leading-relaxed text-text-secondary">
              Browse what&apos;s open right now, or read more about how we keep the community
              trustworthy.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/explore" className="text-[13px] font-semibold text-primary hover:underline">
                Explore trips →
              </Link>
              <Link
                href="/trust-safety"
                className="text-[13px] font-semibold text-primary hover:underline"
              >
                Trust &amp; Safety →
              </Link>
            </div>
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

function StepItem({ icon, title, body }: { icon: string; title: string; body: string }) {
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
