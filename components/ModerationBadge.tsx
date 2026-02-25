"use client";
// components/ModerationBadge.tsx
// Displays a badge if a post or article is flagged for moderator attention.

import React from 'react';

interface ModerationBadgeProps {
  reason?: string;
  className?: string;
}

export default function ModerationBadge({ reason, className = '' }: ModerationBadgeProps) {
  return (
    <div className={`inline-flex items-center gap-2 px-2.5 py-1 bg-red-50 border border-red-200 rounded-sm ${className}`}>
      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span className="text-meta text-red-800">
        Flagged for review
      </span>
      {reason && (
        <span className="text-red-700 text-meta ml-2">
          ({reason})
        </span>
      )}
    </div>
  );
}
