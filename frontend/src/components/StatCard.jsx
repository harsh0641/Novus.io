import React from 'react';

export default function StatCard({ icon, label, value, badge, badgeColor, iconBg }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6
                    shadow-card hover:shadow-card-hover hover:-translate-y-px
                    transition-all duration-150">

      {/* Top row — icon + badge */}
      <div className="flex items-center justify-between mb-5">
        <div className={`w-11 h-11 rounded-xl flex items-center
                         justify-center text-xl ${iconBg || 'bg-blue-50'}`}>
          {icon}
        </div>
        {badge && (
          <span className={`text-xs font-semibold ${badgeColor || 'text-green-600'}`}>
            {badge}
          </span>
        )}
      </div>

      {/* Label */}
      <p className="text-sm text-slate-500 font-medium mb-1.5">{label}</p>

      {/* Value */}
      <p className="text-3xl font-bold text-slate-900 leading-none tracking-tight">
        {value}
      </p>
    </div>
  );
}