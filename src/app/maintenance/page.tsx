"use client";

import Link from "next/link";

export default function MaintenancePage() {
    return (
        <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-6 text-center">
            <div className="h-24 w-24 bg-gv-gold rounded-full flex items-center justify-center mb-10 shadow-[0_0_50px_rgba(212,175,55,0.3)] animate-pulse">
                <svg className="h-12 w-12 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.423 4.494c.397-.732 1.457-.732 1.854 0l7.574 13.974c.397.732-.133 1.632-.927 1.632H4.076c-.794 0-1.324-.9-.927-1.632l7.574-13.974zM12 11v2m0 4h.01" />
                </svg>
            </div>
            <h1 className="text-4xl font-black mb-4 uppercase tracking-tighter">System Maintenance</h1>
            <p className="text-gray-500 max-w-md mb-10 leading-relaxed font-medium">
                We are currently performing scheduled maintenance to the GV Capital Trust platform to enhance security and performance. Please check back later.
            </p>
            <div className="pt-10 border-t border-gray-200 w-full max-w-xs text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                GV CAPITAL TRUST | Private Wealth Management
            </div>
        </div>
    );
}
