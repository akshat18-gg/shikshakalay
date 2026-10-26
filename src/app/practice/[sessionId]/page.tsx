import type { Metadata } from "next";
import { PracticeRoom } from "@/components/practice/PracticeRoom";
import { t } from "@/lib/i18n";
import { currentLang } from "@/lib/lang";
import { pageSession } from "@/lib/pageAccess";

export async function generateMetadata(): Promise<Metadata> {
  return { title: t("practice.title", await currentLang()) };
}

/** Loads the whole lesson on the server, so a page reload brings the teacher back to where she was. */
export default async function PracticePage({ params }: PageProps<"/practice/[sessionId]">) {
  const { sessionId } = await params;
  const { session } = await pageSession(sessionId);
  return <PracticeRoom initial={session} />;
}
