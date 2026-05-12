import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TeamProvider } from "@/context/TeamContext";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "야구없인못살아",
  description: "내가 응원하는 팀의 정보와 직관 기록을 한번에!",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "야구없인못살아",
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
