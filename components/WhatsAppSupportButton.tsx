"use client";

/**
 * Floating "Need help? Chat with us" button — fixed bottom-right on every
 * page, opens a WhatsApp chat to the support number an admin sets at
 * /admin/settings (migration 058's site_settings table) with a prefilled
 * message. Renders nothing when no number is set, so there's no dead
 * button before an admin configures one.
 *
 * Number is fetched server-side (lib/site-settings-server.ts) in the root
 * layout and passed down as a prop — avoids a client-side fetch flash on
 * every single page load for something that's the same on every page.
 */
export function WhatsAppSupportButton({ phoneNumber }: { phoneNumber: string | null }) {
  if (!phoneNumber) return null;

  const digitsOnly = phoneNumber.replace(/[^0-9]/g, "");
  const message = "Hi GoTogether, I need help with…";
  const href = `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Need help? Chat with us on WhatsApp"
      className="fixed right-5 bottom-5 z-[80] flex items-center gap-2 rounded-full bg-[#25D366] py-3 pr-4 pl-3 text-white shadow-[0_8px_24px_-8px_oklch(20%_0.02_255/0.35)] transition-transform hover:scale-105"
    >
      <WhatsAppGlyph />
      <span className="hidden text-[13px] font-semibold sm:inline">Need help? Chat with us</span>
    </a>
  );
}

function WhatsAppGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.33 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.67a8.2 8.2 0 0 1 5.83 2.42 8.19 8.19 0 0 1 2.41 5.82c0 4.55-3.7 8.25-8.25 8.25a8.24 8.24 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.4c0-4.55 3.7-8.24 8.26-8.24Zm-4.53 4.5c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.02s.87 2.35 1 2.51c.12.16 1.7 2.6 4.11 3.64.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.19-.71-.63-1.19-1.42-1.33-1.66-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.31-.74-1.79-.19-.47-.4-.4-.54-.41h-.46Z" />
    </svg>
  );
}
