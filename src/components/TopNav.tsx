import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export function TopNav() {
  return (
    <header className="sticky top-0 z-50 border-b bg-[rgb(var(--bg)/0.8)] backdrop-blur border-[rgb(var(--border))]">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold tracking-tight text-[rgb(var(--fg))]">
            DocReview Pro
          </Link>

          <nav className="hidden items-center gap-4 text-sm md:flex">
            <Link
              href="/docs"
              className="text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))]"
            >
              Documents
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}