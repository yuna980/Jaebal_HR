import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATH_PREFIXES = ['/login', '/signup', '/auth'];
const TEAM_SETUP_PATH = '/teams';

function isPublicPath(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (!user && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (!user) {
    return response;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('favorite_team_id')
    .eq('id', user.id)
    .maybeSingle();

  const hasCompletedSignup = Boolean(profile?.favorite_team_id);

  if (user && (pathname === '/login' || pathname === '/signup')) {
    const targetUrl = request.nextUrl.clone();
    targetUrl.pathname = hasCompletedSignup ? '/dashboard' : TEAM_SETUP_PATH;
    targetUrl.search = '';
    return NextResponse.redirect(targetUrl);
  }

  if (!hasCompletedSignup && pathname !== TEAM_SETUP_PATH && !isPublicPath(pathname)) {
    const teamsUrl = request.nextUrl.clone();
    teamsUrl.pathname = TEAM_SETUP_PATH;
    teamsUrl.search = '';
    return NextResponse.redirect(teamsUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js)$).*)'],
};
