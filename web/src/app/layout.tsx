"use client";

import "./globals.css";

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>Smart Task Management Dashboard</title>
        <meta name="description" content="Developed by Priyanshu Solanki" />
      </head>
      <body>{children}</body>
    </html>
  );
}
