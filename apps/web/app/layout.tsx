import type { Metadata } from 'next';
import { Poppins, Alegreya } from 'next/font/google';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-poppins',
});

const alegreya = Alegreya({
  subsets: ['latin'],
  weight: ['500', '700', '800'],
  display: 'swap',
  variable: '--font-alegreya',
});

export const metadata: Metadata = {
  title: {
    default: 'TherapOS',
    template: '%s | TherapOS',
  },
  description: 'AI-powered clinical documentation for therapists',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${poppins.variable} ${alegreya.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
