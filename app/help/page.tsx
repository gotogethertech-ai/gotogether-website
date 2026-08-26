import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Help & Support — GoTogether",
};

const FAQS = [
  {
    q: "Why do I need to verify my ID?",
    a: "Every traveller confirms their phone, email, and a government-issued ID before creating or joining a trip. It's what lets other members trust that you are who you say you are — the same standard we hold everyone to.",
  },
  {
    q: "How long does verification take?",
    a: "Submitting your ID takes a couple of minutes, and review is usually completed within 24 hours. You'll be notified the moment it's decided.",
  },
  {
    q: "What's the difference between a community trip and a Verified Partner trip?",
    a: "A community trip is organized by a fellow verified traveller — you request to join, and the organizer accepts, waitlists, or declines you. A Verified Partner trip is run by a registered travel company that's been checked for business registration and GST, and you book a seat directly.",
  },
  {
    q: "How does the waiting list work?",
    a: "If a trip is full, your request joins the waiting list in the order it was received. As accepted members drop out or spots open up, the next person on the list is promoted automatically.",
  },
  {
    q: "How is Trust Score calculated?",
    a: "It's built from your verified trip history and the reviews left by real co-travellers after completed trips — it reflects past behaviour, not a promise about future trips.",
  },
  {
    q: "Someone made me uncomfortable. What can I do?",
    a: "You can report a user, a trip, a message, or a review at any time, and block anyone you don't want to interact with. Our team reviews every report, and serious or repeated issues can lead to a restriction or suspension of the account involved.",
  },
  {
    q: "How do I delete my account?",
    a: "Go to Settings, scroll to the bottom, and select Delete account. You'll be asked to confirm before anything happens.",
  },
];

/**
 * Help & Support — static FAQ + contact page, same structural convention
 * as trust-safety/about/how-it-works. Content reflects the real product
 * (verification flow, waiting-list promotion, Trust Score, report/block,
 * delete account) — no invented policies.
 *
 * Contact email is a real, monitored inbox (gotogethertech@gmail.com).
 */
export default function HelpPage() {
  return (
    <>
      <Header activePath="/help" />
      <main className="flex-1 bg-surface">
        <div className="mx-auto max-w-[720px] px-8 py-11 pb-20 max-[599px]:px-4">
          <h1 className="mb-2.5 font-display text-[30px] font-bold">Help &amp; Support</h1>
          <p className="mb-1 max-w-[580px] text-sm leading-relaxed text-text-tertiary">
            Answers to the questions we hear most. Can&apos;t find what you need? Reach us directly
            below.
          </p>

          <section className="border-b border-border-divider py-7 pt-8">
            <h2 className="mb-3 font-display text-lg font-bold">Frequently asked questions</h2>
            <div className="flex flex-col gap-4">
              {FAQS.map((item) => (
                <div key={item.q}>
                  <div className="mb-1 text-[13px] font-bold">{item.q}</div>
                  <p className="text-[12.5px] leading-relaxed text-text-secondary">{item.a}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-7 rounded-2xl bg-surface-tint px-6.5 py-5.5">
            <div className="mb-1.5 text-sm font-bold">Still need help?</div>
            <p className="mb-3 text-[12.5px] leading-relaxed text-text-secondary">
              Email us and we&apos;ll get back to you as soon as we can — for anything from a
              technical issue to reporting a concern about another member.
            </p>
            <a
              href="mailto:gotogethertech@gmail.com"
              className="text-[13px] font-semibold text-primary hover:underline"
            >
              gotogethertech@gmail.com →
            </a>
          </div>

          <p className="mt-6 text-[11.5px] text-text-muted">
            For details on how we verify members and keep the community accountable, see{" "}
            <Link href="/trust-safety" className="font-semibold text-primary hover:underline">
              Trust &amp; Safety
            </Link>
            .
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
