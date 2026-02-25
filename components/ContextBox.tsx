"use client";
// components/ContextBox.tsx
// Condensed context to aid reader understanding, shows on article pages.

import React from 'react';

interface ContextBoxProps {
  content: string;
  className?: string;
  articleType?: string;
}

export default function ContextBox({ content, className = '', articleType }: ContextBoxProps) {
  if (!content) return null;

  return (
    <div className={`context-box ${className}`}>
      <p className="text-meta text-charcoal-muted mb-2 flex items-center gap-2">
        <span className="text-secondary/60" aria-hidden>◈</span>
        Why this story matters
      </p>
      <p className="text-body text-charcoal/85 leading-relaxed">{content}</p>
    </div>
  );
}
