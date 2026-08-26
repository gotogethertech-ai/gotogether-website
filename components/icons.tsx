/**
 * Shared line icons, 20px default, matching the mobile app's minimal-icon
 * principle carried into the website (Navigation System Step 8).
 */
type IconProps = {
  size?: number;
  className?: string;
};

export function SearchIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path
        d="M20 20l-4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MessageIcon({ size = 19, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="2" />
      <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function BellIcon({ size = 19, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 3a6 6 0 00-6 6v4l-2 3h16l-2-3V9a6 6 0 00-6-6z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

export function HamburgerIcon({ size = 18, className }: IconProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-[3px] ${className ?? ""}`}
      aria-hidden="true"
    >
      <span style={{ width: size, height: 2, background: "currentColor" }} />
      <span style={{ width: size, height: 2, background: "currentColor" }} />
      <span style={{ width: size, height: 2, background: "currentColor" }} />
    </div>
  );
}

export function CloseIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChatBubbleIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 6h16v11H8l-4 4z"
        stroke="var(--color-secondary)"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}

export function ShieldIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6z"
        stroke="var(--color-accent)"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}
