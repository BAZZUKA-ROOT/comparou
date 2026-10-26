import type { ReactNode } from "react";

export const metadata = {
  title: "Comparou",
  description: "Comparador de preços multi-loja via Google Shopping",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
