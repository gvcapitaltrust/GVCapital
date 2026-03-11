import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // The user 'thenja96@gmail.com' must have total access.
    // Since we can't reliably parse the JWT in the Edge without overhead,
    // we will allow all requests to proceed and handle the "Master Bypass" 
    // in the AuthProvider and AuthGuard which have full access to the user object.
    
    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/dashboard/:path*'],
};
