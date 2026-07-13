import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  description: "Nền tảng tổ chức và vận hành giải đấu thể thao.",
  title: "AutoBracket",
};

interface RootLayoutProps {
  readonly children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
