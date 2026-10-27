/**
 * Finding users and their consent. Mock mode: the three demo users live in memory (PIN = DEMO_PIN, default 1234),
 * no database. Real mode: the users / consents tables.
 */
import type { Lang, SessionUser } from "@/lib/contracts";
import { hashPin, verifyPin } from "./pin";

export const CONSENT_VERSION = "v1";

const mock = () => process.env.USE_MOCKS === "1";

const DEMO_USERS: SessionUser[] = [
  { id: "mock-teacher", code: "teacher_demo", role: "teacher", lang: "en" },
  { id: "mock-trainer", code: "trainer_demo", role: "trainer", lang: "en" },
  { id: "mock-admin", code: "admin_demo", role: "admin", lang: "en" },
];
const mockConsented = new Set<string>();
let demoPinHash: Promise<string> | undefined;
// Checked against this when the ID doesn't exist, so a wrong ID takes as long as a wrong PIN.
let dummyHash: Promise<string> | undefined;

async function db() {
  return import("@/lib/db/queries/users");
}

/** The user for this ID and PIN, or null. Unknown IDs and wrong PINs look the same to the caller. */
export async function checkLogin(code: string, pin: string): Promise<SessionUser | null> {
  let found: { user: SessionUser; pinHash: string | null } | null;
  if (mock()) {
    const user = DEMO_USERS.find((u) => u.code === code.toLowerCase());
    demoPinHash ??= hashPin(process.env.DEMO_PIN ?? "1234");
    found = user ? { user, pinHash: await demoPinHash } : null;
  } else {
    found = await (await db()).dbFindUserByCode(code);
  }
  if (!found?.pinHash) {
    dummyHash ??= hashPin("0000");
    await verifyPin(pin, await dummyHash);
    return null;
  }
  return (await verifyPin(pin, found.pinHash)) ? found.user : null;
}

export async function hasConsent(userId: string): Promise<boolean> {
  return mock() ? mockConsented.has(userId) : (await db()).dbHasConsent(userId);
}

export async function saveConsent(userId: string): Promise<void> {
  if (mock()) mockConsented.add(userId);
  else await (await db()).dbSaveConsent(userId, CONSENT_VERSION);
}

export async function setUserLang(userId: string, lang: Lang): Promise<void> {
  if (!mock()) await (await db()).dbSetUserLang(userId, lang);
}
