import type { Metadata, Viewport } from "next";
import { Noto_Sans, Noto_Sans_Devanagari } from "next/font/google";
import { LangProvider } from "@/components/LangProvider";
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
    title: { default: t("app.name", lang), template: `%s — ${t("app.name", lang)}` },
    description: t("app.tagline", lang),
  };
}

export const viewport: Viewport = { themeColor: "#0b2850", viewportFit: "cover" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const lang = await currentLang(await getUser());
  return (
    <html lang={lang} className={`${notoSans.variable} ${notoDeva.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <LangProvider lang={lang}>
          <TopBar lang={lang} />
          <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
        </LangProvider>
      </body>
    </html>
  );
}
