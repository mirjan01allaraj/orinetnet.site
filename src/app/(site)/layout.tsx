import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import WhatsAppFloating from "@/components/common/WhatsAppFloating";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppFloating />
    </div>
  );
}


export const metadata = {
  title: "ORIENT NET ISP – INTERNET ME FIBËR OPTIKE",
  description: "Orient Net është më shumë se internet. Ne ofrojmë lidhje të SHPEJTË e të SIGURTË, router Wi-Fi 2.4G & 5G për mbulim perfek dhe çmime transparente",
  metadataBase: new URL("https://orientnet.al"),
  openGraph: {
    title: "Orient Net ISP",
    description: "Internet i shpejtë & stabil për familje dhe biznese. Instalimi falas, router dual-band, suport 24/7.",
    url: "https://orientnet.al",
    siteName: "Orient Net",
    images: [{ url: "//og-image.png", width: 1200, height: 630 }],
    locale: "sq_AL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.jpg"],
  },
};
