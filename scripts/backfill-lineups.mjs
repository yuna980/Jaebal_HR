#!/usr/bin/env node

const baseUrl = process.env.SUPABASE_FUNCTIONS_BASE_URL ?? "https://aavafhlsdpredtvosycr.supabase.co";
const syncSecret = process.env.KBO_SYNC_SECRET ?? "";

function parseArgs(argv) {
  const parsed = {};

  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, value = ""] = arg.slice(2).split("=");
    parsed[key] = value;
  }

  return parsed;
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getDateRange(from, to) {
  const dates = [];
  const [fromYear, fromMonth, fromDay] = from.split("-").map(Number);
  const [toYear, toMonth, toDay] = to.split("-").map(Number);
  const cursor = new Date(Date.UTC(fromYear, fromMonth - 1, fromDay));
  const end = new Date(Date.UTC(toYear, toMonth - 1, toDay));

  while (cursor.getTime() <= end.getTime()) {
    const year = cursor.getUTCFullYear();
    const month = String(cursor.getUTCMonth() + 1).padStart(2, "0");
    const day = String(cursor.getUTCDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

async function invokeSync(date, dryRun) {
  const response = await fetch(`${baseUrl}/functions/v1/sync-lineups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-sync-secret": syncSecret,
    },
    body: JSON.stringify({
      mode: "lineups",
      date,
      dryRun,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`${date} 호출 실패: ${response.status} ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const from = args.from;
  const to = args.to;
  const dryRun = args["dry-run"] === "true";

  if (!syncSecret) {
    throw new Error("KBO_SYNC_SECRET 환경변수가 필요합니다.");
  }

  if (!isValidDate(from) || !isValidDate(to)) {
    throw new Error("--from=YYYY-MM-DD 와 --to=YYYY-MM-DD 형식으로 실행해주세요.");
  }

  const dates = getDateRange(from, to);
  const results = [];

  for (const date of dates) {
    const result = await invokeSync(date, dryRun);
    results.push({
      date,
      totalSchedules: result.totalSchedules ?? 0,
      attempted: result.attempted ?? 0,
      saved: result.saved ?? 0,
      skipped: result.skipped ?? 0,
      errors: Array.isArray(result.errors) ? result.errors.length : 0,
    });
    console.log(
      `${date} | total=${result.totalSchedules ?? 0} attempted=${result.attempted ?? 0} saved=${result.saved ?? 0} skipped=${result.skipped ?? 0} errors=${Array.isArray(result.errors) ? result.errors.length : 0}`
    );
  }

  const summary = results.reduce(
    (acc, item) => {
      acc.totalSchedules += item.totalSchedules;
      acc.attempted += item.attempted;
      acc.saved += item.saved;
      acc.skipped += item.skipped;
      acc.errors += item.errors;
      return acc;
    },
    { totalSchedules: 0, attempted: 0, saved: 0, skipped: 0, errors: 0 }
  );

  console.log("\n요약");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
