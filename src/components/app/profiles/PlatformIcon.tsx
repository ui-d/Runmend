import type { Platform } from "@/lib/types";

interface PlatformIconProps {
  platform: Platform;
  size?: number;
  className?: string;
}

/**
 * Brand-recognizable inline SVGs for each integration. Sized to match a 4
 * tailwind unit by default. Falls back to a neutral square if a future
 * platform string slips through.
 */
export function PlatformIcon({
  platform,
  size = 16,
  className,
}: PlatformIconProps) {
  if (platform === "make") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        className={className}
        aria-label="Make.com"
        role="img"
      >
        <rect width="32" height="32" rx="6" fill="#6D00CC" />
        <path d="M9 8h3v16H9z" fill="#fff" />
        <path d="M14.5 8h3v16h-3z" fill="#fff" opacity="0.85" />
        <path d="M20 8h3v16h-3z" fill="#fff" opacity="0.7" />
      </svg>
    );
  }
  if (platform === "n8n") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        className={className}
        aria-label="n8n"
        role="img"
      >
        <rect width="32" height="32" rx="6" fill="#EA4B71" />
        <circle cx="11" cy="11" r="2.5" fill="#fff" />
        <circle cx="21" cy="11" r="2.5" fill="#fff" />
        <circle cx="16" cy="21" r="2.5" fill="#fff" />
        <path
          d="M11 11 L16 21 L21 11"
          stroke="#fff"
          strokeWidth="1.5"
          fill="none"
          opacity="0.7"
        />
      </svg>
    );
  }
  return (
    <span
      className={`inline-block rounded bg-muted ${className ?? ""}`}
      style={{ width: size, height: size }}
    />
  );
}
