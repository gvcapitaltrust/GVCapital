import React from 'react';

interface VerificationBadgeProps {
    is_verified: boolean;
    kyc_step: number;
}

export default function VerificationBadge({ is_verified, kyc_step }: VerificationBadgeProps) {
    let statusText = 'Unverified';
    let colorClass = 'bg-zinc-500/10 text-gray-500 border-zinc-500/20';
    let dotClass = 'bg-zinc-500';

    if (is_verified) {
        statusText = 'Fully Verified';
        colorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        dotClass = 'bg-emerald-500';
    } else if (kyc_step === 3) {
        statusText = 'KYC Verified';
        colorClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        dotClass = 'bg-blue-500';
    }

    return (
        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border backdrop-blur-sm transition-colors ${colorClass}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${dotClass} shadow-[0_0_8px_currentColor]`} aria-hidden="true"></span>
            {statusText}
        </span>
    );
}
