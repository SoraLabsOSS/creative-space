import type { Metadata } from "next";
import localFont from "next/font/local";

import { Navbar } from "@/components/navbar";

import "./globals.css";

const layGrotesk = localFont({
  display: "swap",
  src: [
    {
      path: "../../public/fonts/LayGrotesk-Medium.woff",
      style: "normal",
      weight: "500",
    },
  ],
  variable: "--font-lay-grotesk",
});

const teodor = localFont({
  display: "swap",
  src: [
    {
      path: "../../public/fonts/Teodor-Light.woff",
      style: "normal",
      weight: "300",
    },
    {
      path: "../../public/fonts/Teodor-Regular.woff",
      style: "normal",
      weight: "400",
    },
  ],
  variable: "--font-teodor",
});

export const metadata: Metadata = {
  description: "Sora Labs — Creative Space",
  title: "Sora Labs",
};

const RootLayout = ({ children }: LayoutProps<"/">) => (
  <html
    lang="en"
    className={`${layGrotesk.variable} ${teodor.variable} h-full antialiased`}
  >
    <body className="font-lay-grotesk flex min-h-full flex-col">
      <Navbar />
      {children}
    </body>
  </html>
);

export default RootLayout;
