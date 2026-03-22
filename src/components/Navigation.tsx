"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import MobileSideMenu from "./MobileSideMenu";

interface NavigationProps {
  lang: "en" | "zh";
  user?: any;
  setLang: (lang: "en" | "zh") => void;
}

export default function Navigation({ lang, user, setLang }: NavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const content = {
    en: {
      services: "Services",
      about: "About Us",
      contact: "Contact",
      login: "Client Login",
      dashboard: "Dashboard",
    },
    zh: {
      services: "服务",
      about: "关于我们",
      contact: "联系我们",
      login: "客户登录",
      dashboard: "控制台",
    },
  };

  const t = content[lang];

  return (
    <>
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-[#121212]/80 backdrop-blur-md transition-all duration-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Link href={`/?lang=${lang}`} className="flex items-center transition-transform hover:scale-105">
              <img
                src="/logo.png"
                alt="GV Capital Trust Logo"
                className="h-[40px] sm:h-[60px] w-auto object-contain mix-blend-screen drop-shadow-[0_4px_6px_rgba(212,175,55,0.4)]"
              />
            </Link>
          </div>

          <div className="flex items-center gap-4 sm:gap-8">
            {/* Desktop Full Menu */}
            <div className="hidden items-center gap-6 text-sm font-black uppercase tracking-widest text-zinc-400 md:flex">
              <Link href="#" className="hover:text-gv-gold transition-colors">{t.services}</Link>
              <Link href="#" className="hover:text-gv-gold transition-colors">{t.about}</Link>
              <Link href="#" className="hover:text-gv-gold transition-colors">{t.contact}</Link>
            </div>

            <div className="flex items-center gap-4">
              {/* Language Switcher - Hide on very small screens, show in mobile menu instead? No, keep it accessible. */}
              <button
                onClick={() => setLang(lang === "en" ? "zh" : "en")}
                className="hidden sm:block rounded-full border border-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all text-white"
              >
                {lang === "en" ? "简体中文" : "English"}
              </button>

              {/* Desktop Auth Links */}
              <div className="hidden md:block">
                {user ? (
                  <Link
                    href={`/dashboard?lang=${lang}`}
                    className="rounded-full bg-gv-gold px-6 py-2.5 text-xs font-black uppercase tracking-widest text-black hover:bg-gv-gold/90 transition-all active:scale-95 shadow-[0_10px_20px_rgba(212,175,55,0.2)]"
                  >
                    {t.dashboard}
                  </Link>
                ) : (
                  <Link
                    href={`/login?lang=${lang}`}
                    className="rounded-full bg-gv-gold px-6 py-2.5 text-xs font-black uppercase tracking-widest text-black hover:bg-gv-gold/90 transition-all active:scale-95 shadow-[0_10px_20px_rgba(212,175,55,0.2)]"
                  >
                    {t.login}
                  </Link>
                )}
              </div>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMenuOpen(true)}
                className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <MobileSideMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        lang={lang}
        currentTab=""
      />
    </>
  );
}
