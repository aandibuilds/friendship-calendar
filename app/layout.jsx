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
      </head>
      <body>{children}</body>
    </html>
  );
}
