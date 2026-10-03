import "./globals.css";

export const metadata = {
  title: "AeroGuía",
  description: "Mapas, servicios y cómo llegar en el aeropuerto.",
  applicationName: "AeroGuía",
  appleWebApp: { capable: true, title: "AeroGuía", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icon-180.png", sizes: "180x180" }]
  },
  manifest: "/manifest.json"
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#071526"
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AeroGuía" />
        <link rel="apple-touch-icon" href="/icon-180.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
