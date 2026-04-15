import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TeamProvider } from "@/context/TeamContext";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "야구볼래 - 귀여운 야구 정보 서비스",
  description: "내가 응원하는 팀의 정보와 직관 기록을 한번에!",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "야구볼래",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <TeamProvider>
          {children}
          <BottomNav />
        </TeamProvider>
      </body>
    </html>
  );
}
