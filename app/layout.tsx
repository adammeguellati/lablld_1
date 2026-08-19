import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

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
      </body>
    </html>
  );
}
