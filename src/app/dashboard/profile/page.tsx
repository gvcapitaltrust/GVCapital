import type { Metadata } from 'next';
import ProfileClient from './ProfileClient';
import { Suspense } from 'react';

export const metadata: Metadata = {
    title: 'Profile Management | GV Capital Trust',
    description: 'Manage your personal profile and account level details.',
};

export default function Page() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6"><div className="h-12 w-12 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>}>
            <ProfileClient />
        </Suspense>
    );
}
