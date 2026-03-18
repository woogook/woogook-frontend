import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const notoSans = Noto_Sans_KR({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

const notoSerif = Noto_Serif_KR({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "내 선거 안내서 — 2026 지방선거 유권자 지원",
  description:
    "주소를 입력하면 내가 뽑는 선출직과 후보를 한눈에 비교할 수 있는 지방선거 유권자 지원 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${notoSans.variable} ${notoSerif.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
