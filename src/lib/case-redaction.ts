export function redactSensitiveText(input: string): string {
  return input
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email hidden]")
    .replace(/(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}/g, "[phone hidden]");
}

export function summarizeCaseDescription(input: string, maxLen = 180): string {
  const safe = redactSensitiveText(input).trim();
  if (safe.length <= maxLen) {
    return safe;
  }
  return `${safe.slice(0, maxLen).trimEnd()}...`;
}

export function formatRelativeTime(dateInput: Date): string {
  const now = Date.now();
  const ts = dateInput.getTime();
  const diffSeconds = Math.round((ts - now) / 1000);
  const abs = Math.abs(diffSeconds);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (abs < 60) return rtf.format(diffSeconds, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSeconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSeconds / 3600), "hour");
  return rtf.format(Math.round(diffSeconds / 86400), "day");
}
