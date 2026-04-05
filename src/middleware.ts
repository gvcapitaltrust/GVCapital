import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Read Supabase auth cookie (Standardized)
    const token = 
        request.cookies.get('gv-auth-v1')?.value ??
        request.cookies.get('sb-prmeppkidipenldrrpis-auth-token')?.value ??
        request.headers.get('Authorization')?.split('Bearer ')[1];

    const isAuthenticated = !!token;

    // Protect all dashboard & admin routes from unauthenticated users
    if (!isAuthenticated) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Admin route protection: Verify authentication
    if (pathname.startsWith('/admin')) {
        if (!isAuthenticated) {
            return NextResponse.redirect(new URL('/login?redirect=' + pathname, request.url));
        }
        // Specific role-based authorization is deferred to the client-side AuthGuard 
        // to ensure the most up-to-date role from the 'profiles' table is used.
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/dashboard/:path*'],
};

