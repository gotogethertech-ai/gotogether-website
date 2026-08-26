import Image from "next/image";

type LogoProps = {
  size?: number;
  wordmarkSize?: number;
  showWordmark?: boolean;
  className?: string;
};

/**
 * GoTogether logo mark — the official brand mark (interlocking O/G),
 * served from /public/brand. Replaces the earlier placeholder
 * overlapping-circles SVG.
 */
export function Logo({
  size = 40,
  wordmarkSize = 20,
  showWordmark = true,
  className = "",
}: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Image
        src="/brand/gotogether-logo-512.png"
        alt="GoTogether"
        width={size}
        height={size}
        priority
        className="flex-none"
      />
      {showWordmark && (
        <span
          className="font-display font-bold"
          style={{ fontSize: wordmarkSize }}
        >
          GoTogether
        </span>
      )}
    </div>
  );
}
