import React from 'react';

// ── Ultra-Minimal Geometric Icon ────────────────────────────────────────
export function NovusIcon({ size = 32 }) {
  const id = `ng-${size}`;
  const gf = `gf-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={id} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#3b82f6"/>
          <stop offset="50%"  stopColor="#8b5cf6"/>
          <stop offset="100%" stopColor="#e879f9"/>
        </linearGradient>
        <filter id={gf}>
          <feGaussianBlur stdDeviation="2" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* Precision sharp lines */}
      <polyline points="12,50 24,36 38,26 52,14"
                stroke={`url(#${id})`} strokeWidth="1.5" fill="none"
                strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="50" r="3.5" fill="#3b82f6" filter={`url(#${gf})`}/>
      <circle cx="12" cy="50" r="1.5" fill="#FFFFFF"/>
      
      <circle cx="24" cy="36" r="4.5" fill="#6366f1" filter={`url(#${gf})`}/>
      <circle cx="24" cy="36" r="2"   fill="#FFFFFF"/>
      
      <circle cx="38" cy="26" r="5.5" fill="#8b5cf6" filter={`url(#${gf})`}/>
      <circle cx="38" cy="26" r="2.5" fill="#FFFFFF"/>
      
      <circle cx="52" cy="14" r="7.5" fill="#e879f9" filter={`url(#${gf})`}/>
      <circle cx="52" cy="14" r="3"   fill="#FFFFFF"/>
    </svg>
  );
}

// ── Wordmark ────────────────────────────────
export function NovusWordmark({ fontSize = 22, color = '#FFFFFF' }) {
  return (
    <svg width={fontSize * 5.8} height={fontSize * 1.8} viewBox={`0 0 ${fontSize * 5.8} ${fontSize * 1.8}`} xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <text
        x="50%"
        y={fontSize * 1.2}
        textAnchor="middle"
        fontFamily="'Inter', system-ui, sans-serif"
        fontWeight="500"
        fontSize={fontSize}
        letterSpacing={fontSize * 0.15}
        fill={color}
      >NOVUS</text>
    </svg>
  );
}

// ── Full Logo ───────────────────────────────────────────────────
const SIZES = {
  sm: { iconSize: 20, fontSize: 13, gap: 10 },
  md: { iconSize: 28, fontSize: 17, gap: 12 },
  lg: { iconSize: 40, fontSize: 24, gap: 16 },
};

export default function NovusLogo({ size = 'md', textColor = '#FFFFFF', variant = 'full', collapsed = false }) {
  const { iconSize, fontSize, gap } = SIZES[size] || SIZES.md;
  
  if (variant === 'icon' || collapsed) return <NovusIcon size={iconSize} />;
  if (variant === 'wordmark') return <NovusWordmark fontSize={fontSize} color={textColor} />;
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap, cursor: 'pointer' }}>
      <NovusIcon size={iconSize} />
      <span style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        fontWeight: 500,
        fontSize,
        letterSpacing: '0.15em',
        color: textColor,
        lineHeight: 1,
        whiteSpace: 'nowrap'
      }}>NOVUS</span>
    </div>
  );
}