import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BlastScript — a language with a shooter's vocabulary",
  description:
    "spawn, hit, score, loot. A small, ambitious, gradually-typed language with arcade-shooter syntax, a tree-walking interpreter, and a JS compiler. Run it live in the browser.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
