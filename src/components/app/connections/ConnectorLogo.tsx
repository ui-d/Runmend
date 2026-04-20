import type { CatalogSlug } from "@/lib/connections/catalog";

interface ConnectorLogoProps {
  slug: CatalogSlug | string;
  size?: number;
  className?: string;
}

/**
 * Inline brand SVGs for every catalog slug. Keeps the connections page
 * scannable at a glance and removes a network roundtrip per tile. Neutral
 * initials fallback for slugs that ship before we add art.
 */
export function ConnectorLogo({ slug, size = 32, className }: ConnectorLogoProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    role: "img" as const,
    "aria-label": slug,
    className,
  };

  if (slug === "make") {
    return (
      <svg {...common}>
        <rect width="32" height="32" rx="7" fill="#6D00CC" />
        <path d="M9 8h3v16H9z" fill="#fff" />
        <path d="M14.5 8h3v16h-3z" fill="#fff" opacity="0.85" />
        <path d="M20 8h3v16h-3z" fill="#fff" opacity="0.7" />
      </svg>
    );
  }
  if (slug === "n8n") {
    return (
      <svg {...common}>
        <rect width="32" height="32" rx="7" fill="#EA4B71" />
        <circle cx="11" cy="11" r="2.5" fill="#fff" />
        <circle cx="21" cy="11" r="2.5" fill="#fff" />
        <circle cx="16" cy="21" r="2.5" fill="#fff" />
        <path d="M11 11 L16 21 L21 11" stroke="#fff" strokeWidth="1.5" fill="none" opacity="0.7" />
      </svg>
    );
  }
  if (slug === "zapier") {
    return (
      <svg {...common}>
        <rect width="32" height="32" rx="7" fill="#FF4F00" />
        <path
          d="M16 8v5.2l3.7-3.7 2.1 2.1L18.1 15H24v3h-5.9l3.7 3.7-2.1 2.1L16 20.1V25h-3v-4.9l-3.7 3.7-2.1-2.1L10.9 18H5v-3h5.9L7.2 11.3l2.1-2.1L13 12.9V8z"
          fill="#fff"
        />
      </svg>
    );
  }
  if (slug === "pipedream") {
    return (
      <svg {...common}>
        <rect width="32" height="32" rx="7" fill="#0B0A17" />
        <path d="M11 6h5a6 6 0 0 1 0 12h-2v8h-3z" fill="#55D397" />
        <path d="M14 9v6h2a3 3 0 0 0 0-6z" fill="#0B0A17" />
      </svg>
    );
  }
  if (slug === "workato") {
    return (
      <svg {...common}>
        <rect width="32" height="32" rx="7" fill="#F05A28" />
        <path
          d="M6 11l3 10h3l2-6 2 6h3l3-10h-3l-1.5 6L16 11h-2l-1.5 6L11 11z"
          fill="#fff"
        />
      </svg>
    );
  }
  if (slug === "relay") {
    return (
      <svg {...common}>
        <rect width="32" height="32" rx="7" fill="#7C5CFF" />
        <path
          d="M10 8h8a5 5 0 0 1 1.8 9.7L23 24h-3.5l-3-6H13v6h-3zm3 3v4h5a2 2 0 0 0 0-4z"
          fill="#fff"
        />
      </svg>
    );
  }
  if (slug === "tray") {
    return (
      <svg {...common}>
        <rect width="32" height="32" rx="7" fill="#00B5AD" />
        <path
          d="M8 10h16v3h-6.5v10h-3V13H8zM10 22h2v2h-2zm10 0h2v2h-2z"
          fill="#fff"
        />
      </svg>
    );
  }
  if (slug === "bardeen") {
    return (
      <svg {...common}>
        <rect width="32" height="32" rx="7" fill="#1E1E2A" />
        <path
          d="M9 7h7a6 6 0 0 1 4 10.4A5 5 0 0 1 17 27H9zm3 3v5h4a2.5 2.5 0 0 0 0-5zm0 8v6h5a3 3 0 0 0 0-6z"
          fill="#FBBF24"
        />
      </svg>
    );
  }
  if (slug === "airtable_automations") {
    return (
      <svg {...common}>
        <rect width="32" height="32" rx="7" fill="#111" />
        <path d="M6 12l10-4 10 4-10 4z" fill="#FCB400" />
        <path d="M6 14l10 4v8L6 22z" fill="#18BFFF" />
        <path d="M26 14l-10 4v8l10-4z" fill="#F82B60" />
      </svg>
    );
  }
  if (slug === "lindy") {
    return (
      <svg {...common}>
        <rect width="32" height="32" rx="7" fill="#0EA5E9" />
        <circle cx="12" cy="14" r="2.5" fill="#fff" />
        <circle cx="20" cy="14" r="2.5" fill="#fff" />
        <path d="M10 20q6 6 12 0" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  const initials = String(slug).slice(0, 2).toUpperCase();
  return (
    <div
      className={`inline-flex items-center justify-center rounded-md bg-muted text-[10px] font-semibold text-muted-foreground ${className ?? ""}`}
      style={{ width: size, height: size }}
      aria-label={String(slug)}
    >
      {initials}
    </div>
  );
}
