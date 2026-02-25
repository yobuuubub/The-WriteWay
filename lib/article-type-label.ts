import type { ArticleType } from "../types/article";

const ARTICLE_TYPE_LABELS: Record<ArticleType, string> = {
  reporting: "Reporting",
  explainer: "Analysis",
  perspective: "Voices",
  letter: "Letter",
};

export function getArticleTypeLabel(type: string): string {
  return ARTICLE_TYPE_LABELS[type as ArticleType] || type;
}
