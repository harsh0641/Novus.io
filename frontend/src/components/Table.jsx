import React from 'react';

// ── Stage badge colors ────────────────────────────────────────────────────────
const BADGE = {
  Applied:   'bg-slate-100 text-slate-600',
  Interview: 'bg-blue-100 text-blue-700',
  Offer:     'bg-green-100 text-green-700',
  Rejected:  'bg-red-100 text-red-600',
};

export default function Table({ data, onRowClick }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-card">
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="text-5xl mb-4">📭</div>
          <p className="font-semibold text-slate-500">No applications yet</p>
          <p className="text-sm mt-1">Hit <strong>Sync Gmail</strong> to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-card overflow-hidden">
      <table className="w-full border-collapse">

        {/* Header */}
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="tbl-header">Company</th>
            <th className="tbl-header">Job Title</th>
            <th className="tbl-header">Applied Date</th>
            <th className="tbl-header">Stage</th>
            <th className="tbl-header">Recruiter</th>
            <th className="tbl-header">Email</th>
            <th className="tbl-header">LinkedIn</th>
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {data.map((row, i) => {
            const letter    = row.company_name?.[0]?.toUpperCase() || '?';
            const badgeCls  = BADGE[row.stage] || BADGE.Applied;
            const recName   = row.recruiter_name  || '';
            const recTitle  = row.recruiter_title || '';
            const recEmail  = row.recruiter_email || '';
            const linkedIn  = row.linkedin_url    || '';

            return (
              <tr
                key={row.id || i}
                className="tbl-row"
                onClick={() => onRowClick && onRowClick(row)}
              >
                {/* Company */}
                <td className="tbl-cell">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200
                                    flex items-center justify-center text-xs font-bold
                                    text-slate-500 flex-shrink-0">
                      {letter}
                    </div>
                    <span className="font-semibold text-slate-900">
                      {row.company_name}
                    </span>
                  </div>
                </td>

                {/* Job Title */}
                <td className="tbl-cell text-slate-600">{row.position}</td>

                {/* Date */}
                <td className="tbl-cell text-slate-500 whitespace-nowrap">
                  {row.applied_date}
                </td>

                {/* Stage */}
                <td className="tbl-cell">
                  <span className={`badge ${badgeCls}`}>{row.stage}</span>
                </td>

                {/* Recruiter */}
                <td className="tbl-cell">
                  {recName ? (
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">
                        👤 {recName}
                      </div>
                      {recTitle && (
                        <div className="text-xs text-slate-400 mt-0.5">{recTitle}</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-300 text-xs italic">Not found</span>
                  )}
                </td>

                {/* Email */}
                <td className="tbl-cell">
                  {recEmail ? (
                    <span className="text-xs text-slate-600 break-all">{recEmail}</span>
                  ) : (
                    <span className="text-slate-300 text-xs">—</span>
                  )}
                </td>

                {/* LinkedIn */}
                <td className="tbl-cell">
                  {linkedIn ? (
                    <a
                      href={linkedIn}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 bg-blue-50 text-blue-600
                                 border border-blue-200 rounded-lg px-2.5 py-1
                                 text-xs font-semibold hover:bg-blue-100 transition-colors"
                    >
                      🔗 LinkedIn
                    </a>
                  ) : (
                    <span className="text-slate-300 text-xs">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}