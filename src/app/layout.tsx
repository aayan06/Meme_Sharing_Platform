import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

const defaultMetadata = {
  title: 'HAHA LAUNCH',
  description: 'Your daily dose of AI-powered humor',
  openGraph: {
    title: 'HAHA LAUNCH',
    description: 'Your daily dose of AI-powered humor',
    images: [`https://placehold.co/1200x630.png`],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HAHA LAUNCH',
    description: 'Your daily dose of AI-powered humor',
    images: [`https://placehold.co/1200x630.png`],
  },
};

export const metadata: Metadata = defaultMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
