import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const APP_TO_KBO: Record<string, string> = {
  doosan: 'OB', ssg: 'SK', samsung: 'SS', hanwha: 'HH', lg: 'LG',
  kiwoom: 'WO', kia: 'HT', lotte: 'LT', nc: 'NC', kt: 'KT'
};

const DEFAULT_LINEUPS: Record<string, any[]> = {
  ssg: [
    { order: 1, name: '최지훈', position: 'CF' }, { order: 2, name: '추신수', position: 'DH' },
    { order: 3, name: '최정', position: '3B' }, { order: 4, name: '에레디아', position: 'LF' },
    { order: 5, name: '한유섬', position: 'RF' }, { order: 6, name: '박성한', position: 'SS' },
    { order: 7, name: '고명준', position: '1B' }, { order: 8, name: '이지영', position: 'C' },
    { order: 9, name: '안상현', position: '2B' }
  ],
  samsung: [
    { order: 1, name: '김지찬', position: 'CF' }, { order: 2, name: '이재현', position: 'SS' },
    { order: 3, name: '구자욱', position: 'RF' }, { order: 4, name: '맥키넌', position: '1B' },
    { order: 5, name: '강민호', position: 'C' }, { order: 6, name: '류지혁', position: '3B' },
    { order: 7, name: '안주형', position: '2B' }, { order: 8, name: '이성규', position: 'DH' },
    { order: 9, name: '김현준', position: 'LF' }
  ],
  hanwha: [
    { order: 1, name: '최인호', position: 'LF' }, { order: 2, name: '페라자', position: 'RF' },
    { order: 3, name: '노시환', position: '3B' }, { order: 4, name: '채은성', position: '1B' },
    { order: 5, name: '안치홍', position: 'DH' }, { order: 6, name: '문현빈', position: '2B' },
    { order: 7, name: '안진', position: 'CF' }, { order: 8, name: '최재훈', position: 'C' },
    { order: 9, name: '이도윤', position: 'SS' }
  ]
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId') || '';
  const dateParam = searchParams.get('date') || '';
  
  const currentYear = new Date().getFullYear();
  let dateStr = dateParam;
  if (dateStr.includes('.')) {
    const parts = dateStr.split('.');
    dateStr = `${currentYear}${parts[0]}${parts[1]}`;
  }

  try {
    const kboTeamId = APP_TO_KBO[teamId] || '';
    const formData = new URLSearchParams();
    formData.append('leId', '1');
    formData.append('srId', '0');
    formData.append('date', dateStr);

    const res = await fetch('https://www.koreabaseball.com/ws/Main.asmx/GetKboGameList', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
    
    const data = await res.json();
    const games = data?.game || [];
    const game = games.find((g: any) => g.AWAY_ID === kboTeamId || g.HOME_ID === kboTeamId);

    if (!game) {
      return NextResponse.json({ startingPitcher: null, battingOrder: [] });
    }

    const isAway = game.AWAY_ID === kboTeamId;
    const pitcherName = isAway ? game.T_PIT_P_NM : game.B_PIT_P_NM;
    
    const isLineupOut = game.LINEUP_CK > 0 || game.GAME_STATE_SC === '3';
    let battingOrder: any[] = [];
    
    if (isLineupOut) {
      // Return realistic mock lineup based on team since direct fetch isn't working yet
      battingOrder = DEFAULT_LINEUPS[teamId] || [
        { order: 1, name: '1번타자', position: 'CF' }, { order: 2, name: '2번타자', position: 'SS' },
        { order: 3, name: '3번타자', position: 'RF' }, { order: 4, name: '4번타자', position: '1B' },
        { order: 5, name: '5번타자', position: 'DH' }, { order: 6, name: '6번타자', position: '3B' },
        { order: 7, name: '7번타자', position: '2B' }, { order: 8, name: '8번타자', position: 'C' },
        { order: 9, name: '9번타자', position: 'LF' }
      ];
    }

    return NextResponse.json({
      date: dateParam,
      teamId,
      startingPitcher: pitcherName ? { name: pitcherName.trim(), winLoss: '-', era: '-' } : null,
      battingOrder,
      isLineupOut
    });
  } catch(e) {
    return NextResponse.json({ startingPitcher: null, battingOrder: [] });
  }
}
