"use client";

import { logout } from "@/lib/api";
import { useT } from "./LangProvider";

export function LogoutButton() {
  const t = useT();
  async function leave() {
    try {
      await logout();
    } finally {
      window.location.assign("/login"); // full load: drop every page cached while logged in
    }
  }
  return (
    <button
      type="button"
      onClick={leave}
      className="min-h-11 px-2 text-sm underline outline-none focus-visible:ring-3 focus-visible:ring-mint"
    >
      {t("nav.logout")}
    </button>
  );
}
