import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { VerificationRequiredInterstitial } from "@/components/auth/VerificationRequiredInterstitial";
import { CompleteProfileBanner } from "@/components/auth/CompleteProfileBanner";
import { AuthErrorBanner } from "@/components/auth/AuthErrorBanner";
import { PostHogPageView } from "@/components/analytics/PostHogPageView";
import { SITE_URL } from "@/lib/site";

const TITLE = "GoTogether — Find people already planning your next trip";
const DESCRIPTION =
  "Search a destination, see who's going, and join a trip with real travellers — verified, reviewed, and ready to plan with you.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s",
  },
  description: DESCRIPTION,
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "GoTogether",
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    images: [
      {
        url: "/brand/gotogether-logo-512.png",
        width: 512,
        height: 512,
        alt: "GoTogether",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/brand/gotogether-logo-512.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        {/* Google Sans Text + Roboto, per the approved design docs' own
            <link> tags. Loaded at runtime (not next/font/google) since the
            build sandbox has no network access to fonts.googleapis.com;
            browsers fetch these normally. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Google+Sans+Text:wght@400;500;700&family=Roboto:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <PostHogPageView />
        </Suspense>
        <AuthProvider>
          <AuthErrorBanner />
          <CompleteProfileBanner />
          {children}
          <VerificationRequiredInterstitial />
        </AuthProvider>
      </body>
    </html>
  );
}
