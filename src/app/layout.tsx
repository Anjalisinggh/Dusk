import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

// one family, two jobs: extra-wide black for the headline, normal width for the small text
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: "Dusk",
  description: "Two sides. One identity. A rooftop at dusk, and the thing that comes out after dark.",
};

export const viewport: Viewport = {
  themeColor: "#0f1838",
  viewportFit: "cover",
};

// Restore the last chosen side before paint, so a refresh never flashes the wrong one.
const boot = `(function(){var d=document.documentElement,t='light';try{if(localStorage.getItem('theme')==='dark')t='dark'}catch(e){}d.dataset.theme=t})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={archivo.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
