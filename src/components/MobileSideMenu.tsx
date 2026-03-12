"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";

interface MobileSideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  lang: "en" | "zh";
  user?: any;
}

export default function MobileSideMenu({ isOpen, onClose, lang, user }: MobileSideMenuProps) {
  // Prevent scrolling when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const content = {
    en: {
      services: "Services",
      about: "About Us",
      contact: "Contact",
      login: "Client Login",
      dashboard: "Dashboard",
      logout: "Log Out",
    },
    zh: {
      services: "服务",
      about: "关于我们",
      contact: "联系我们",
      login: "客户登录",
      dashboard: "控制台",
      logout: "退出登录",
    }
  };

  const t = content[lang];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Side Menu */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-80 bg-[#121212] border-l border-white/10 shadow-2xl transition-transform duration-500 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full p-8">
          <div className="flex items-center justify-between mb-12">
            <img src="/logo.png" alt="GV Capital" className="h-10 w-auto object-contain mix-blend-screen" />
            <button
              onClick={onClose}
              className="p-2 rounded-full border border-white/10 hover:bg-white/5 transition-all text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <nav className="flex-1 space-y-6">
            <Link
              href={`/?lang=${lang}`}
              onClick={onClose}
              className="block text-2xl font-black text-white hover:text-gv-gold transition-colors uppercase tracking-widest"
            >
              Home
            </Link>
            <Link
              href="#"
              onClick={onClose}
              className="block text-2xl font-black text-white hover:text-gv-gold transition-colors uppercase tracking-widest"
            >
              {t.services}
            </Link>
            <Link
              href="#"
              onClick={onClose}
              className="block text-2xl font-black text-white hover:text-gv-gold transition-colors uppercase tracking-widest"
            >
              {t.about}
            </Link>
            <Link
              href="#"
              onClick={onClose}
              className="block text-2xl font-black text-white hover:text-gv-gold transition-colors uppercase tracking-widest"
            >
              {t.contact}
            </Link>

            <div className="pt-10 border-t border-white/10 mt-10">
              {user ? (
                <Link
                  href={`/dashboard?lang=${lang}`}
                  onClick={onClose}
                  className="block text-2xl font-black text-gv-gold hover:opacity-80 transition-all uppercase tracking-widest"
                >
                  {t.dashboard}
                </Link>
              ) : (
                <Link
                  href={`/login?lang=${lang}`}
                  onClick={onClose}
                  className="block text-2xl font-black text-gv-gold hover:opacity-80 transition-all uppercase tracking-widest"
                >
                  {t.login}
                </Link>
              )}
            </div>
          </nav>

          <div className="pt-8 border-t border-white/10">
            <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em]">
              GV Capital Trust &copy; 2026
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
