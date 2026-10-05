import type { Metadata } from 'next';
import '@starter/project-ui/styles.css';
export const metadata: Metadata = {
  title: 'Project Studio',
  description: 'A calm place to organize your projects, wherever you work.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
