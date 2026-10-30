import type { Metadata, Viewport } from "next";
import { Noto_Sans, Noto_Sans_Devanagari } from "next/font/google";
import { Footer } from "@/components/Footer";
import { LangProvider } from "@/components/LangProvider";
import { ServiceWorker } from "@/components/ServiceWorker";
import { TopBar } from "@/components/TopBar";
import { getUser } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { currentLang } from "@/lib/lang";
import "./globals.css";

const notoSans = Noto_Sans({ variable: "--font-noto-sans", subsets: ["latin"], display: "swap" });
const notoDeva = Noto_Sans_Devanagari({ variable: "--font-noto-deva", subsets: ["devanagari"], display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const lang = await currentLang(await getUser());
  return {
    // Absolute URLs for link previews (WhatsApp, social): PUBLIC_BASE_URL on Render, localhost in development.
    metadataBase: new URL(process.env.PUBLIC_BASE_URL ?? "http://localhost:3000"),
    title: { default: t("app.name", lang), template: `%s — ${t("app.name", lang)}` },
    description: t("app.tagline", lang),
    icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
    openGraph: {
      title: "Shikshakalay — practise a lesson, get kind coaching",
      description: t("app.tagline", "en"),
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "Shikshakalay" }],
      type: "website",
    },
  };
}

export const viewport: Viewport = { themeColor: "#0b2850", viewportFit: "cover" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getUser();
  const lang = await currentLang(user);
  return (
    <html lang={lang} className={`${notoSans.variable} ${notoDeva.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <LangProvider lang={lang}>
          <TopBar lang={lang} loggedIn={user !== null} />
          <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
          <Footer lang={lang} />
          <ServiceWorker />
        </LangProvider>
      </body>
    </html>
  );
}
