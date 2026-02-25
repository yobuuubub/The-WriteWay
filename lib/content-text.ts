export function stripHtmlToText(value: string): string {
  return (value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasVisibleText(value: string): boolean {
  return stripHtmlToText(value).length > 0;
}

export function isLikelyHtml(value: string): boolean {
  return /<[^>]+>/.test(value || "");
}
