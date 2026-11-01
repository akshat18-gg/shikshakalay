"use client";

import { logout } from "@/lib/api";
import { reloadTo } from "@/lib/navigation";
import { useT } from "./LangProvider";

export function LogoutButton() {
  const t = useT();
  async function leave() {
    try {
      await logout();
    } finally {
      reloadTo("/login");
    }
  }
  return (
    <button
      type="button"
      onClick={leave}
      className="press min-h-11 px-1 text-xs text-white/85 outline-none hover:text-white focus-visible:ring-3 focus-visible:ring-white/60"
    >
      {t("nav.logout")}
    </button>
  );
}
