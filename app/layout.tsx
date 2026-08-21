import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'LABLLD',
  description: 'White-label fulfillment platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body suppressHydrationWarning className={`${manrope.variable} font-sans antialiased`}>
        {children}
        {/* The app has no dark mode, so the theme is pinned rather than left on
            "system": a viewer whose OS is dark would otherwise get dark toasts
            on light screens. */}
        <Toaster theme="light" position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
