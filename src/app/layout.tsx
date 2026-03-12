import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "GV Capital Trust",
    template: "%s | GV Capital Trust",
  },
  description: "Secure private investment platform providing trustworthy wealth management solutions in Malaysia.",
  icons: {
    icon: "/favicon.png",
  },
};

import { AuthProvider } from "@/providers/AuthProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${montserrat.variable} antialiased`}
      >
        <AuthProvider>
          <div className="main-container">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
