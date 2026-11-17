import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SIM-PKM Poltek SSN — Sistem Informasi Manajemen PKM Taruna',
  description:
    'Sistem Informasi Manajemen Penelitian dan Pengabdian kepada Masyarakat Politeknik Siber dan Sandi Negara',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full font-sans antialiased text-slate-800 selection:bg-sky-100 selection:text-sky-900 bg-[#061E45] relative">
        {children}
      </body>
    </html>
  );
}
