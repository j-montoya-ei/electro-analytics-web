// ═══════════════════════════════════════════════════════════
// Layout raíz - Electro-Analytics
// Configuración global: tipografía, metadata, idioma
// ═══════════════════════════════════════════════════════════

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gestión Humana Analytics · Electroingeniería",
  description: "Dashboard de análisis de Gestión Humana - Electroingeniería S.A.S.",
  icons: {
    icon: "/logos/electroingenieria-isotipo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
