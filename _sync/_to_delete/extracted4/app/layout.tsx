import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth/AuthModal";
import { VerificationRequiredInterstitial } from "@/components/auth/VerificationRequiredInterstitial";

export const metadata: Metadata = {
  title: "GoTogether — Find people already planning your next trip",
  description:
    "Search a destination, see who's going, and join a trip with real travellers — verified, reviewed, and ready to plan with you.",
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
        <AuthProvider>
          {children}
          <AuthModal />
          <VerificationRequiredInterstitial />
        </AuthProvider>
      </body>
    </html>
  );
}
