import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Glimsey · Every event vendor. One place.",
  description: "دليل مزودي خدمات الحفلات والمناسبات في السعودية",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-stone-50 text-stone-900">{children}</body>
    </html>
  );
}
