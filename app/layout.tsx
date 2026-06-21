import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AbhyasMitra Premium — Engineering Notes for SPPU Students",
    template: "%s | AbhyasMitra Premium",
  },
  description:
    "Premium subject-wise engineering notes for SPPU students. Purchase, download, and ace your exams with AbhyasMitra Premium.",
  keywords: [
    "SPPU notes",
    "engineering notes",
    "pune university notes",
    "study material",
    "engineering study",
  ],
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: "AbhyasMitra Premium",
    title: "AbhyasMitra Premium — Engineering Notes for SPPU Students",
    description:
      "Premium subject-wise engineering notes for SPPU students. Study smarter, score higher.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AbhyasMitra Premium",
    description: "Premium engineering notes for SPPU students",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#18181f",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#f0f0f5",
            },
          }}
        />
      </body>
    </html>
  );
}
