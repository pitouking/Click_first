import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Click_first Dashboard",
  description: "Admin minimal — pages draft/published",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
