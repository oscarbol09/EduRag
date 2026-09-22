import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/context";
import { SupportWidget } from "@/components/SupportWidget";

const fontSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://edu-rag-red.vercel.app"),
  title: {
    default: "EduRAG — Asistentes Pedagógicos con RAG",
    template: "%s | EduRAG",
  },
  description: "Plataforma educativa para crear tutores inteligentes a partir de apuntes, guías y sílabos en PDF, Word o Markdown. Embebible en Moodle y Canvas.",
  keywords: [
    "RAG educativo",
    "chatbots para docentes",
    "asistentes pedagógicos",
    "Moodle IA",
    "Canvas LMS",
    "educación superior",
    "OpenRouter BYOK",
  ],
  authors: [{ name: "EduRAG" }],
  creator: "EduRAG",
  publisher: "EduRAG",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "EduRAG — Asistentes Pedagógicos con RAG",
    description: "Crea tutores inteligentes a partir de tus documentos y apuntes de clase con trazabilidad estricta de fuentes.",
    url: "https://edu-rag-red.vercel.app",
    siteName: "EduRAG",
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EduRAG — Asistentes Pedagógicos con RAG",
    description: "Tutoría inteligente basada en documentos de clase para docentes y estudiantes.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${fontSans.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 selection:bg-zinc-800 selection:text-white font-sans">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-zinc-100 focus:text-zinc-900 focus:rounded-lg focus:shadow-xl text-xs font-semibold"
        >
          Saltar al contenido principal
        </a>
        <AppProvider>
          <div id="main-content" className="flex-1 flex flex-col">
            {children}
          </div>
          <SupportWidget />
        </AppProvider>
      </body>
    </html>
  );
}
