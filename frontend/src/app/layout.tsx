import type { Metadata } from "next";
import { Plus_Jakarta_Sans, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/context";
import { SupportWidget } from "@/components/SupportWidget";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const serif = DM_Serif_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "EduRAG - Plataforma Educativa con RAG",
  description: "Crea agentes conversacionales basados en tus documentos educativos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${jakarta.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900" style={{ fontFamily: "var(--font-sans), sans-serif" }}>
        <AppProvider>
          {children}
          <SupportWidget />
        </AppProvider>
      </body>
    </html>
  );
}
