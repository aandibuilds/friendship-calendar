import './globals.css';

export const metadata = {
  title: 'Friendship Calendar',
  description: 'Stay intentional about the people who matter.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#E6E2F5',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Friendships" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
