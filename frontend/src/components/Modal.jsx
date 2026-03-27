import React, { useEffect } from 'react';

const BADGE = {
  Applied:   'bg-slate-100 text-slate-600',
  Interview: 'bg-blue-100 text-blue-700',
  Offer:     'bg-green-100 text-green-700',
  Rejected:  'bg-red-100 text-red-600',
};

export default function Modal({ row, onClose }) {
  // Close on ESC key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!row) return null;

  const badgeCls = BADGE[row.stage] || BADGE.Applied;

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Box */}
      <div className="bg-white rounded-3xl w-full max-w-xl max-h-[88vh]
                      overflow-y-auto shadow-modal">

        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-7 pt-6 pb-5
                        border-b border-slate-100 rounded-t-3xl
                        flex items-start justify-between">
          <div>
            <p className="text-xs font-bold text-primary-600 uppercase
                          tracking-widest mb-1">
              {row.company_name?.toUpperCase()}
            </p>
            <h2 className="text-xl font-bold text-slate-900 leading-snug">
              {row.position}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-slate-200
                       flex items-center justify-center text-slate-400
                       hover:bg-slate-100 transition-colors flex-shrink-0 ml-4
                       bg-white cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-7 py-5">

          {/* Pills */}
          <div className="flex flex-wrap gap-2 mb-5">
            <span className={`badge ${badgeCls}`}>{row.stage}</span>
            {row.location && (
              <span className="badge bg-sky-50 text-sky-600">
                📍 {row.location}
              </span>
            )}
            {row.salary_range && (
              <span className="badge bg-yellow-50 text-yellow-700">
                💰 {row.salary_range}
              </span>
            )}
            {row.recruiter_name && (
              <span className="badge bg-green-50 text-green-700">
                👤 Recruiter Found
              </span>
            )}
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <InfoCell label="Applied Date"  value={row.applied_date  || '—'} />
            <InfoCell label="Stage"         value={row.stage         || '—'} />
            <InfoCell label="Last Updated"  value={row.last_updated  || '—'} />
            {row.interview_date && (
              <InfoCell label="Interview Date" value={row.interview_date} />
            )}
          </div>

          {/* Source email */}
          {row.email_subject && row.email_subject !== 'Manually added' && (
            <Section title="Source Email">
              <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-600">
                {row.email_subject}
              </div>
            </Section>
          )}

          {/* Recruiter */}
          {(row.recruiter_name || row.recruiter_email) && (
            <Section title="Recruiter">
              <div className="bg-slate-50 rounded-xl px-4 py-3">
                {row.recruiter_name && (
                  <p className="font-semibold text-slate-800 text-sm">
                    👤 {row.recruiter_name}
                  </p>
                )}
                {row.recruiter_title && (
                  <p className="text-xs text-slate-500 mt-0.5">{row.recruiter_title}</p>
                )}
                {row.recruiter_email && (
                  <p className="text-sm text-slate-600 mt-1">✉️ {row.recruiter_email}</p>
                )}
              </div>
            </Section>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100
                        px-7 py-4 rounded-b-3xl flex gap-3">
          {row.linkedin_url && (
            <a
              href={row.linkedin_url}
              target="_blank"
              rel="noreferrer"
              className="flex-1 btn-primary justify-center"
            >
              🔗 View on LinkedIn
            </a>
          )}
          <button
            onClick={onClose}
            className="flex-1 btn-secondary justify-center"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────
function InfoCell({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-xl px-4 py-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}