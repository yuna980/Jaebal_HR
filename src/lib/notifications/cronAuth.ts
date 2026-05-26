export function isCronAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET 환경변수가 없습니다. 예약 작업 요청을 차단합니다.');
    return false;
  }

  return request.headers.get('authorization') === `Bearer ${cronSecret}`;
}
