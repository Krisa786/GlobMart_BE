import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Authentication - Global International",
  description: "Sign in or create an account to access Global International's premium hospitality products.",
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
