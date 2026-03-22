import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Read Supabase auth cookie (set by supabase-js client)
    const authCookie =
        request.cookies.get('gv-auth-v1') ??
        request.cookies.get('sb-prmeppkidipenldrrpis-auth-token');

    const isAuthenticated = !!authCookie?.value;

    // Protect all dashboard & admin routes from unauthenticated users
    if (!isAuthenticated) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // For admin routes: parse the session to verify role
    if (pathname.startsWith('/admin')) {
        try {
            // The cookie value is a JSON string; parse the user's role
            const sessionData = JSON.parse(decodeURIComponent(authCookie!.value));
            const userRole: string =
                sessionData?.user?.user_metadata?.role ??
                sessionData?.user?.role ??
                '';
            const userEmail: string = sessionData?.user?.email ?? '';

            const masterAdmin = process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL ?? 'thenja96@gmail.com';
            const isAdmin =
                userEmail === masterAdmin ||
                userRole.toLowerCase() === 'admin';

            if (!isAdmin) {
                return NextResponse.redirect(new URL('/dashboard', request.url));
            }
        } catch {
            // If cookie can't be parsed, fall back to allowing through (client AuthGuard will catch it)
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/dashboard/:path*'],
};

