import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InteractiveBackground3D from "@/components/InteractiveBackground3D";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL("https://upgradeskills.co.in"),
  title: {
    default: "Upgrade Skills - Premium LMS & InnoTechXperience",
    template: "%s | Upgrade Skills",
  },
  description: "Learn practical courses from global industry experts and participate in national design & tech competitions to showcase your portfolio.",
  openGraph: {
    title: "Upgrade Skills - Premium LMS & InnoTechXperience",
    description: "Learn practical courses from global industry experts and participate in national design & tech competitions to showcase your portfolio.",
    url: "https://upgradeskills.co.in",
    siteName: "Upgrade Skills",
    images: [
      {
        url: "/readme_banner.png",
        width: 1200,
        height: 630,
        alt: "Upgrade Skills LMS & Challenges Banner",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Upgrade Skills - Premium LMS & InnoTechXperience",
    description: "Learn practical courses from global industry experts and participate in national design & tech competitions to showcase your portfolio.",
    images: ["/readme_banner.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-4B558VDSLR"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-4B558VDSLR');
          `}
        </Script>
        <Providers>
          <InteractiveBackground3D />
          <Header />
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
