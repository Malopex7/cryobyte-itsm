import type { Metadata } from "next";
import "./globals.css";
import { SocketProvider } from "../contexts/SocketContext";
import RegisterServiceWorker from "../components/RegisterServiceWorker";

export const metadata: Metadata = {
  title: "Overwatch ITSM",
  description: "Enterprise Real-Time IT Service Management",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased"
      >
        <SocketProvider>
          <RegisterServiceWorker />
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}

