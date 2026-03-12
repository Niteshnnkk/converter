import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "iLovePDF | Online PDF Tools for PDF Lovers",
  description: "Every tool you need to work with PDFs in one place. Merge, split, compress, convert, rotate, unlock, and watermark PDFs with just a few clicks. 100% free and easy to use!",
  keywords: "PDF, merge PDF, split PDF, compress PDF, convert PDF, PDF tools, online PDF editor",
  openGraph: {
    title: "iLovePDF | Online PDF Tools for PDF Lovers",
    description: "Every tool you need to work with PDFs in one place. 100% free and easy to use!",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <div style={{ paddingTop: '72px' }}>
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
