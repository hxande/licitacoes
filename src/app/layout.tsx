import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Licitações T.I. Brasil - Encontre Oportunidades",
  description: "Aplicação para busca e filtro de licitações públicas na área de T.I. no Brasil.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
