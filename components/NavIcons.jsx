'use client';

const stroke = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  'aria-hidden': true,
};

function S({ children, ...rest }) {
  return (
    <svg {...stroke} stroke="currentColor" strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {children}
    </svg>
  );
}

/** Minimal stroke icons — product-style, not emoji */
export function NavIcon({ id }) {
  switch (id) {
    case 'dashboard':
      return (
        <S>
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </S>
      );
    case 'friends':
      return (
        <S>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </S>
      );
    case 'calendar':
      return (
        <S>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </S>
      );
    case 'reminders':
      return (
        <S>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </S>
      );
    case 'events':
      return (
        <S>
          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
          <path d="M13 5v2M13 17v2M13 11v2" />
        </S>
      );
    case 'review':
      return (
        <S>
          <polyline points="3 3 3 21 21 21" />
          <polyline points="7 16 11 12 15 16 21 10" />
        </S>
      );
    case 'profile':
      return (
        <S>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </S>
      );
    default:
      return (
        <S>
          <circle cx="12" cy="12" r="10" />
        </S>
      );
  }
}
