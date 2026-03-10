import type { Metadata } from 'next';
import DepositClient from './DepositClient';
import { Suspense } from 'react';
import AuthGuard from '@/components/AuthGuard';

export const metadata: Metadata = {
    title: 'Deposit | GV Capital Trust',
};

export default function DepositPage() {
    return (
        <AuthGuard>
            <Suspense fallback={<div className="min-h-screen bg-[#121212] flex items-center justify-center p-6"><div className="h-12 w-12 border-4 border-gv-gold border-t-transparent animate-spin rounded-full"></div></div>}>
                <DepositClient />
            </Suspense>
        </AuthGuard>
    );
}
