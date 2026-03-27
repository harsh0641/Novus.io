import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function TopBar({ title, subtitle, actions }) {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="h-16 bg-white border-b border-slate-200
                    flex items-center justify-between px-8
                    sticky top-0 z-40">
      {/* Left */}
      <div>
        <h1 className="text-lg font-bold text-slate-900 leading-tight">
          {title || 'Dashboard'}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {subtitle || `Welcome back, ${firstName}! Here's your job search overview.`}
        </p>
      </div>

      {/* Right — custom action buttons passed as props */}
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}