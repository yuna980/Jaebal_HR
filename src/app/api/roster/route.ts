import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId') || '';

  const rosterDB: Record<string, any> = {
    ssg: {
      callUps: [],
      sendDowns: []
    },
    samsung: {
      callUps: [
        { name: '이재현', position: '내야수', number: '7' }
      ],
      sendDowns: [
        { name: '오승환', position: '투수', number: '21' }
      ]
    },
    hanwha: {
      callUps: [{ name: '김서현', position: '투수', number: '54' }],
      sendDowns: [{ name: '장민재', position: '투수', number: '45' }]
    }
  };

  const myRoster = rosterDB[teamId] || { callUps: [], sendDowns: [] };

  return NextResponse.json({
    date: new Date().toISOString().split('T')[0],
    teamId,
    ...myRoster
  });
}
