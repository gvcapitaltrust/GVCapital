import type { Metadata } from 'next';
import ApprovalsClient from './ApprovalsClient';
import { Suspense } from 'react';
import AuthGuard from '@/components/AuthGuard';

export const metadata: Metadata = {
    title: 'Admin Approvals | GV Capital Trust',
};

export default function ApprovalsPage() {
    return (
        <AuthGuard requireAdmin={true}>
            <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6"><div className="h-12 w-12 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>}>
                <ApprovalsClient />
            </Suspense>
        </AuthGuard>
    );
}
