import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — do not remove this call. getClaims() verifies the JWT
  // locally against a cached JWKS when the project uses asymmetric signing
  // keys (no auth-server round trip per request); with a legacy HS256 secret
  // it falls back to getUser() internally, so it is never slower than before.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub ?? null;

  // Protect /admin — require administrator role
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!userId) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    if (profile?.role !== 'administrator') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Protect /contribute — require contributor or administrator role
  if (request.nextUrl.pathname.startsWith('/contribute')) {
    if (!userId) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    if (!profile || !['contributor', 'administrator'].includes(profile.role)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return supabaseResponse;
}

// Scope the proxy to the routes whose server components read the session.
// It must NOT match public pages: on Vercel the proxy is a Node function that
// runs BEFORE the CDN cache, so a catch-all matcher put a cold-startable
// lambda + Supabase auth round trip in front of every prerendered page
// (/, /site/[slug], /tag/[slug], ...) — measured as multi-second TTFB in
// Speed Insights. Public pages resolve auth client-side via ProfileContext,
// and the browser client persists refreshed tokens itself.
export const config = {
  matcher: [
    '/admin/:path*',
    '/contribute/:path*',
    '/lists',
    '/list/:path*',
    '/site/:slug/edit',
    '/tag/:slug/edit',
  ],
};
