"use client";

/** ID + 4-digit PIN. The PIN field opens the number pad on phones. */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiClientError, login } from "@/lib/api";
import { reloadTo } from "@/lib/navigation";
import { useT } from "./LangProvider";

export function LoginForm({ next }: { next: string }) {
  const t = useT();
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(code.trim(), pin);
      reloadTo(next);
    } catch (err) {
      const apiCode = err instanceof ApiClientError ? err.code : "internal";
      setError(
        apiCode === "rate_limited"
          ? t("login.locked")
          : apiCode === "unauthorized" || apiCode === "bad_request"
            ? t("login.error")
            : t(apiCode === "network" ? "errors.network" : "errors.internal"),
      );
      setBusy(false);
    }
  }

  const field = "h-11 w-full border border-input px-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="code" className="font-medium">
          {t("login.id")}
        </label>
        <input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={40}
          className={field}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="pin" className="font-medium">
          {t("login.pin")}
        </label>
        <input
          id="pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          autoComplete="current-password"
          required
          className={field}
        />
      </div>
      {error && (
        <p role="alert" className="border-l-4 border-destructive bg-red-50 p-3 text-sm">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={busy || !code.trim() || pin.length !== 4} aria-busy={busy}>
        {busy ? t("common.loading") : t("login.submit")}
      </Button>
    </form>
  );
}
