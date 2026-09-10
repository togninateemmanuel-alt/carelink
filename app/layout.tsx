import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareLink — Votre santé, simplifiée",
  description: "Prenez rendez-vous, recevez vos ordonnances et trouvez vos médicaments facilement.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
