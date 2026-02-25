// lib/permissions.ts
// Simplified permissions - all authenticated users can submit articles

/**
 * Check if user is authenticated (can submit articles)
 */
export function canSubmitArticles(userId: string | null | undefined): boolean {
  return !!userId;
}

/**
 * Check if user can view their own articles (drafts, pending, etc.)
 */
export function canViewOwnArticles(userId: string | null | undefined, articleAuthorId: string): boolean {
  return userId === articleAuthorId;
}
