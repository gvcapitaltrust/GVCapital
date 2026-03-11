import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const url = request.nextUrl.clone();
    
    // We can't easily parse the Supabase JWT here without the secret or a dedicated library 
    // but we can check if there's a specific cookie or state if needed.
    // However, the user specifically asked to "Update middleware.ts to allow thenja96@gmail.com full access".
    
    // Since this is a client-side heavy app with AuthGuard, the middleware's primary job 
    // will be to NOT block this user.
    
    // For now, we will just pass through and let the AuthGuard/AuthProvider handle the logic,
    // as we don't have a reliable way to get the email in the edge without more setup.
    
    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/dashboard/:path*'],
};
