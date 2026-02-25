"use client";
// components/RoleGate.tsx
// Blocks children unless user is authenticated. Otherwise, renders "Access Denied"

import React from 'react';
import { useUser } from '../lib/auth';

interface RoleGateProps {
  children: React.ReactNode;
}

export default function RoleGate({ children }: RoleGateProps) {
  const { user, loading } = useUser();

  // Keep auth transitions visually consistent with the rest of the product.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="w-8 h-8 border-2 border-charcoal/20 border-t-calm rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper px-5">
        <div className="max-w-md w-full p-8 bg-white/90 border border-charcoal/10 rounded-2xl shadow-soft text-center">
          <h1 className="font-display text-3xl mb-3 text-charcoal">Access denied</h1>
          <p className="text-charcoal/70 font-medium mb-6">You must be signed in to access this page.</p>
          <a
            href="/login"
            className="inline-flex px-6 py-3 bg-accent text-white text-sm font-semibold rounded-sm hover:bg-accent-deep transition-colors"
          >
            Go to login
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
