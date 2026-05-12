export function isCronAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return true;
  }

  return request.headers.get('authorization') === `Bearer ${cronSecret}`;
}
