// ============================================================
// Utility functions — Dashboard Monitoring Ketenagakerjaan
// ============================================================

/**
 * Format a number with Indonesian locale (dot for thousands, comma for decimal)
 */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a number as percentage
 */
export function formatPercent(value: number, decimals = 2): string {
  return `${formatNumber(value, decimals)}%`;
}

/**
 * Format a number as Indonesian Rupiah
 */
export function formatRupiah(value: number): string {
  if (value >= 1e12) return `Rp ${formatNumber(value / 1e12, 1)} T`;
  if (value >= 1e9) return `Rp ${formatNumber(value / 1e9, 1)} M`;
  if (value >= 1e6) return `Rp ${formatNumber(value / 1e6, 1)} Jt`;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a date string to Indonesian locale
 */
export function formatDate(dateStr: string, style: "short" | "long" = "short"): string {
  const date = new Date(dateStr);
  if (style === "long") {
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format relative time (e.g., "2 hari lalu")
 */
export function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "baru saja";
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 7) return `${diffDays} hari lalu`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu lalu`;
  return formatDate(dateStr);
}

/**
 * Get change indicator arrow and color
 */
export function getChangeIndicator(value: number): {
  arrow: string;
  color: string;
  label: string;
} {
  if (value > 0)
    return { arrow: "▲", color: "text-emerald-600", label: `+${formatNumber(value, 2)}` };
  if (value < 0)
    return { arrow: "▼", color: "text-red-600", label: formatNumber(value, 2) };
  return { arrow: "—", color: "text-gray-400", label: "0" };
}

/**
 * Classify Tailwind class for data tier badge
 */
export function getDataTierBadge(tier: string): { label: string; className: string } {
  switch (tier) {
    case "official_nso":
      return { label: "NSO Resmi", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    case "ilo_estimate":
      return { label: "Estimasi ILO", className: "bg-amber-50 text-amber-700 border-amber-200" };
    case "worldbank_estimate":
      return { label: "World Bank", className: "bg-blue-50 text-blue-700 border-blue-200" };
    default:
      return { label: tier, className: "bg-gray-50 text-gray-700 border-gray-200" };
  }
}

/**
 * Classify impact badge styling
 */
export function getImpactBadge(dampak: string): { label: string; className: string; emoji: string } {
  switch (dampak) {
    case "positif":
      return { label: "Positif", className: "bg-emerald-50 text-emerald-700", emoji: "🟢" };
    case "negatif":
      return { label: "Negatif", className: "bg-red-50 text-red-700", emoji: "🔴" };
    case "campuran":
      return { label: "Campuran", className: "bg-orange-50 text-orange-700", emoji: "🟠" };
    default:
      return { label: "Netral", className: "bg-gray-50 text-gray-600", emoji: "🟡" };
  }
}

/**
 * Truncate text to max length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

/**
 * Generate a deterministic ID from a string
 */
export function generateId(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Get current survey period based on date
 */
export function getCurrentSurveyPeriod(): { survey: string; release: string; label: string } {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12

  if (month >= 2 && month <= 4)
    return { survey: "Februari", release: "Mei", label: "Feb → Mei" };
  if (month >= 5 && month <= 7)
    return { survey: "Mei", release: "Agustus", label: "Mei → Agu" };
  if (month >= 8 && month <= 10)
    return { survey: "Agustus", release: "November", label: "Agu → Nov" };
  return { survey: "November", release: "Februari", label: "Nov → Feb" };
}

/**
 * Merge class names, filtering out falsy values
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
