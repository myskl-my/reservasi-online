import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "Reservasi Online - Barbershop",
    template: "%s | Reservasi Online",
  },
  description:
    "Reservasi dan manajemen antrean barbershop. Booking online tanpa akun, cek status reservasi dengan kode booking.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className={`min-h-screen antialiased ${jakarta.variable}`}>
        {children}
      </body>
    </html>
  );
}
