"use client";
// components/ArticleStatusBadge.tsx
// Visual status indicator for AI review states

import React from 'react';
import { ArticleStatus } from '../types/article';

interface ArticleStatusBadgeProps {
  status: ArticleStatus;
  className?: string;
}

export default function ArticleStatusBadge({ status, className = '' }: ArticleStatusBadgeProps) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: "Draft", color: "bg-charcoal/8 text-charcoal-muted border-charcoal/15" },
    review: { label: "In review", color: "bg-accent-soft text-accent border-accent/20" },
    pending_ai_review: { label: "AI review", color: "bg-secondary-soft text-secondary border-secondary-muted/30" },
    needs_revision: { label: "Needs revision", color: "bg-amber-50 text-amber-800 border-amber-200" },
    approved: { label: "Approved", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    published: { label: "Published", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    rejected: { label: "Rejected", color: "bg-red-50 text-red-800 border-red-200" },
  };

  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-sm border text-meta ${config.color} ${className}`}>
      {config.label}
    </span>
  );
}