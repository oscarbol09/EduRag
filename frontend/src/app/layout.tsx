import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/context";
import { SupportWidget } from "@/components/SupportWidget";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
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
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AppProvider>
          {children}
          <SupportWidget />
        </AppProvider>
      </body>
    </html>
  );
}
