'use client';

import Link from 'next/link';

export default function ChangeTeamButton() {
  return (
    <Link
      href="/teams"
      className="pill-button"
      style={{
        padding: '10px 14px',
        fontSize: '13px',
        whiteSpace: 'nowrap',
      }}
    >
      응원팀 변경
    </Link>
  );
}
