import React from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: '#000000', color: '#FFFFFF', fontFamily: 'system-ui, sans-serif', margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
