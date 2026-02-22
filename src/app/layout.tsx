import "./globals.css";
import type { Metadata } from "next";
import { TopNav } from "@/components/TopNav";
import { Providers } from "@/app/providers";

export const metadata: Metadata = {
  title: "DocReview Pro",
  description: "Document review & annotation UI (frontend-only mini project)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <div className="min-h-screen">
            <TopNav />
            <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}