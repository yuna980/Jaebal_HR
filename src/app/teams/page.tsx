import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import TeamSelectionGrid from '@/components/TeamSelectionGrid';

async function getServerUserId() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export default async function TeamsPage() {
  const userId = await getServerUserId();

  return (
    <TeamSelectionGrid
      title="응원팀 선택하기"
      description="응원팀까지 골라야 가입이 완료돼요."
      redirectTo="/dashboard"
      userId={userId}
    />
  );
}
