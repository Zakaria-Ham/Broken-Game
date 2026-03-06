import type { Metadata } from "next";
import "./globals.css";
import { GameProvider } from "./context/GameContext";

export const metadata: Metadata = {
  title: "Broken Internet",
  description: "A strange puzzle web game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="scanline-overlay">
        <GameProvider>{children}</GameProvider>
      </body>
    </html>
  );
}
