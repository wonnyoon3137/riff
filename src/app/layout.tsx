import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Riff - 공연 탐색",
  description: "흩어진 공연 정보를 한곳에서 탐색하는 서비스",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
