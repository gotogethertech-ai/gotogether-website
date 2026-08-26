import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms of Service — GoTogether",
};

const SECTIONS = [
  {
    title: "1. Who this agreement is with",
    body: "These Terms govern your use of GoTogether — the website, and any related services we offer for finding and organizing group trips. By creating an account, you agree to these Terms.",
  },
  {
    title: "2. Eligibility",
    body: "You must be at least 18 years old to create an account or use GoTogether. By using the platform you confirm that you meet this requirement and that the information you provide, including for identity verification, is accurate and your own.",
  },
  {
    title: "3. Your account and verification",
    body: "You're responsible for keeping your account secure and for all activity under it. Creating or joining a trip requires completing our identity verification process (phone, email, and a government-issued ID). We may suspend or restrict an account that provides false information or fails verification.",
  },
  {
    title: "4. Community and Verified Partner trips",
    body: "Trips on GoTogether are either organized by individual community members or run by Verified Partner travel companies. A Verified Partner badge confirms we've checked the company's business registration and GST status — it does not guarantee the quality, safety, or outcome of any specific trip. GoTogether is not a party to any trip and does not organize, supervise, or guarantee travel arrangements.",
  },
  {
    title: "5. Your conduct",
    body: "You agree to provide truthful information in your profile and trip listings, communicate honestly with other members, and treat other travellers respectfully. You may not use GoTogether to harass, discriminate against, defraud, or endanger another person. We may remove content, restrict, or suspend accounts that violate these Terms or our Trust & Safety guidelines.",
  },
  {
    title: "6. Reviews and Trust Score",
    body: "Reviews must reflect your genuine experience with a co-traveller from a completed trip. Trust Score is calculated from verified trip history and reviews — it is a reflection of past behaviour on the platform, not a guarantee about any individual's future conduct.",
  },
  {
    title: "7. Payments",
    body: "Where a trip involves payment to a Verified Partner company, that payment is between you and the company under their own terms; GoTogether may facilitate the transaction but is not the seller of record for the trip itself.",
  },
  {
    title: "8. Limitation of liability",
    body: "GoTogether provides tools to help you find and vet travel companions, but travelling with anyone — verified or not — carries inherent risk. To the fullest extent permitted by law, GoTogether is not liable for the conduct of any user, organizer, or Verified Partner company, or for any loss, injury, or damage arising from a trip arranged through the platform.",
  },
  {
    title: "9. Termination",
    body: "You may delete your account at any time from Settings. We may suspend or terminate an account that violates these Terms, engages in unsafe or fraudulent behaviour, or poses a risk to other members.",
  },
  {
    title: "10. Changes to these Terms",
    body: "We may update these Terms from time to time. We'll post the revised version here with an updated date, and continued use of GoTogether after a change means you accept the updated Terms.",
  },
  {
    title: "11. Contact",
    body: "Questions about these Terms can be sent to gotogethertech@gmail.com.",
  },
];

/**
 * Terms of Service — static legal-style page, structurally matching the
 * other static pages in app/ (Header/Footer, Section pattern). Content
 * reflects real product mechanics: 18+ eligibility already enforced
 * elsewhere in the app, ID verification, community vs. Verified Partner
 * trips, Trust Score.
 */
export default function TermsPage() {
  return (
    <>
      <Header activePath="/legal/terms" />
      <main className="flex-1 bg-surface">
        <div className="mx-auto max-w-[720px] px-8 py-11 pb-20 max-[599px]:px-4">
          <h1 className="mb-2.5 font-display text-[30px] font-bold">Terms of Service</h1>
          <p className="mb-5 text-[11.5px] text-text-muted">Last updated: August 2026</p>

          <div className="flex flex-col gap-6">
            {SECTIONS.map((s) => (
              <section key={s.title}>
                <h2 className="mb-1.5 font-display text-[15px] font-bold">{s.title}</h2>
                <p className="text-[12.5px] leading-relaxed text-text-secondary">{s.body}</p>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
