"use client";

import {
  FormEvent,
  useState,
} from "react";

import { setAdminSession } from "@/lib/cms-editor-access";

function safeDestination(
  value: string | null,
): string {
  if (
    value &&
    value.startsWith("/") &&
    !value.startsWith("//")
  ) {
    return value;
  }

  return "/admin";
}

function extractErrorMessage(
  payload: unknown,
): string {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload
  ) {
    const message = (
      payload as {
        message?: unknown;
      }
    ).message;

    if (typeof message === "string") {
      return message;
    }

    if (Array.isArray(message)) {
      return message.join("، ");
    }
  }

  return "ورود به پنل مدیریت ناموفق بود.";
}

export default function AdminLoginPage() {
  const [mobile, setMobile] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setBusy(true);
    setError("");

    try {
      const response = await fetch(
        "/api/admin/login",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json; charset=utf-8",
          },
          credentials: "include",
          body: JSON.stringify({
            mobile,
            password,
          }),
        },
      );

      const payload = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(payload),
        );
      }

      const accessToken =
        typeof payload?.access_token ===
        "string"
          ? payload.access_token
          : "";

      const role =
        typeof payload?.user?.role ===
        "string"
          ? payload.user.role
              .trim()
              .toLowerCase()
          : "";

      if (!accessToken || !role) {
        throw new Error(
          "اطلاعات ورود مدیریت دریافت نشد.",
        );
      }

      setAdminSession(accessToken);

      const params = new URLSearchParams(
        window.location.search,
      );

      window.location.replace(
        safeDestination(
          params.get("next"),
        ),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "خطا در ورود به پنل مدیریت.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 text-white"
    >
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <p className="mb-3 text-xs tracking-[0.3em] text-amber-200">
          FELORAL ADMIN
        </p>

        <h1 className="text-2xl font-bold">
          ورود به پنل مدیریت
        </h1>

        <p className="mt-3 text-sm leading-7 text-white/60">
          این بخش فقط برای مدیران مجاز
          فلورال در دسترس است.
        </p>

        <form
          className="mt-8 space-y-5"
          onSubmit={submit}
        >
          <label className="block">
            <span className="mb-2 block text-sm text-white/75">
              شماره موبایل مدیر
            </span>

            <input
              dir="ltr"
              inputMode="numeric"
              autoComplete="username"
              value={mobile}
              onChange={(event) =>
                setMobile(
                  event.target.value,
                )
              }
              className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-left outline-none transition focus:border-amber-200/70"
              placeholder="09121111111"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-white/75">
              رمز عبور
            </span>

            <input
              dir="ltr"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-left outline-none transition focus:border-amber-200/70"
              placeholder="••••••••"
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-amber-200 px-4 py-3 font-bold text-black transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy
              ? "در حال بررسی..."
              : "ورود به مدیریت"}
          </button>
        </form>
      </section>
    </main>
  );
}