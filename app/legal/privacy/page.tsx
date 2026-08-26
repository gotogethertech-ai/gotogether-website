import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy — GoTogether",
};

const SECTIONS = [
  {
    title: "1. Information we collect",
    body: "Account information you provide directly: your name, email, phone number, date of birth, gender, bio, and profile photo. Verification information: the government-issued ID and any supporting documents you submit for identity verification. Trip activity: trips you create, join, save, or request to join, messages you send within trip chats, and reviews you write or receive. We don't collect more than we need to run the platform and keep it trustworthy.",
  },
  {
    title: "2. How we use your information",
    body: "To operate your account and verify your identity before you can create or join a trip. To show other members the profile information you've chosen to share (name, photo, bio, verification badges, Trust Score, reviews) so they can decide who to travel with. To calculate your Trust Score from your verified trip history and reviews. To communicate with you about your account, trips, and requests. To keep the platform safe — investigating reports, enforcing our Trust & Safety guidelines, and preventing fraud.",
  },
  {
    title: "3. What other members can see",
    body: "Your name, profile photo, bio, verification badges, Trust Score, review history, and travel history are visible on your public profile to any signed-in member. Your date of birth and exact contact details (phone, email) are never shown to other members — only used internally for verification and age-eligibility checks.",
  },
  {
    title: "4. Verification documents",
    body: "ID documents and selfies submitted for verification are used solely to confirm your identity and are handled with additional restricted access, limited to the verification review process. We do not display these documents to other members or use them for any purpose beyond verification.",
  },
  {
    title: "5. Sharing your information",
    body: "We don't sell your personal information. We share information with Verified Partner companies only when you book a trip with them, limited to what's needed to complete that booking. We may disclose information if required by law, or to protect the safety of our members.",
  },
  {
    title: "6. Data retention",
    body: "We retain your account information for as long as your account is active. If you delete your account, we remove or anonymize your personal information within our systems, except where we're required to retain records (for example, for legal or safety investigations already in progress).",
  },
  {
    title: "7. Your choices",
    body: "You can review and update most of your profile information at any time from Edit Profile and Settings. You can delete your account from Settings — this is permanent and cannot be undone. You can contact us to ask what information we hold about you.",
  },
  {
    title: "8. Security",
    body: "We use industry-standard measures, including row-level access controls on our database, to protect your information. No system is perfectly secure, and we encourage you to use a strong, unique password for your account.",
  },
  {
    title: "9. Changes to this policy",
    body: "We may update this Privacy Policy from time to time. We'll post the revised version here with an updated date.",
  },
  {
    title: "10. Contact",
    body: "Questions about this policy, or requests about your personal information, can be sent to gotogethertech@gmail.com.",
  },
];

/**
 * Privacy Policy — static legal-style page, same structural convention as
 * app/legal/terms/page.tsx. Content is grounded in what the product
 * actually stores/shows today (users table: name, email, phone, DOB,
 * gender, bio, avatar_url, verification_status; the separate
 * verifications table for ID documents; public profile visibility rules
 * from lib/real-profile.ts).
 */
export default function PrivacyPage() {
  return (
    <>
      <Header activePath="/legal/privacy" />
      <main className="flex-1 bg-surface">
        <div className="mx-auto max-w-[720px] px-8 py-11 pb-20 max-[599px]:px-4">
          <h1 className="mb-2.5 font-display text-[30px] font-bold">Privacy Policy</h1>
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
