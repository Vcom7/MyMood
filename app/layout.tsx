import type { Metadata } from 'next';
import { Epilogue, Be_Vietnam_Pro, Public_Sans } from 'next/font/google';
import './globals.css';

const epilogue = Epilogue({
  subsets: ['latin'],
  variable: '--font-headline',
});

const beVietnamPro = Be_Vietnam_Pro({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-body',
});

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-label',
});

export const metadata: Metadata = {
  title: 'MyMood - Diario Emocional',
  description: 'Un diario de estado de ánimo diario, elegante y sencillo.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${epilogue.variable} ${beVietnamPro.variable} ${publicSans.variable}`}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
