import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WizerView Prototype',
  description: 'A clickable prototype for lightweight client review and approval flows.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
