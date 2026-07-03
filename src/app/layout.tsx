import type { Metadata } from 'next';
import './globals.css';
import { ReduxProvider } from '@/components/ReduxProvider';

export const metadata: Metadata = {
  title: 'Annotation Activity Console',
  description:
    'Internal dashboard for annotators to view tasks, monitor live updates, and read AI-generated summaries.',
  keywords: ['annotation', 'tasks', 'dashboard', 'AI', 'monitoring'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ReduxProvider>{children}</ReduxProvider>
      </body>
    </html>
  );
}
