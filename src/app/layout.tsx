import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

// one family, two jobs: extra-wide and heavy for headings, normal width for reading
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: "Dusk",
  description: "Two sides. One identity. One city at 7:42 in the evening and at 3:12 in the morning.",
};

export const viewport: Viewport = {
  themeColor: "#0a0d14",
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
