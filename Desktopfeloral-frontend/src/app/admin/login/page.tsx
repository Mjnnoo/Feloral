"use client";

import {
  FormEvent,
  useState,
} from "react";


const TEXT = {
  title:
    "\u0648\u0631\u0648\u062f \u0628\u0647 \u067e\u0646\u0644 \u0645\u062f\u06cc\u0631\u06cc\u062a",

  description:
    "\u0627\u06cc\u0646 \u0628\u062e\u0634 \u0641\u0642\u0637 \u0628\u0631\u0627\u06cc \u0645\u062f\u06cc\u0631\u0627\u0646 \u0645\u062c\u0627\u0632 \u0641\u0644\u0648\u0631\u0627\u0644 \u062f\u0631 \u062f\u0633\u062a\u0631\u0633 \u0627\u0633\u062a.",

  mobileLabel:
    "\u0634\u0645\u0627\u0631\u0647 \u0645\u0648\u0628\u0627\u06cc\u0644 \u0645\u062f\u06cc\u0631",

  passwordLabel:
    "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631",

  loading:
    "\u062f\u0631 \u062d\u0627\u0644 \u0628\u0631\u0631\u0633\u06cc...",

  submit:
    "\u0648\u0631\u0648\u062f \u0628\u0647 \u0645\u062f\u06cc\u0631\u06cc\u062a",

  failed:
    "\u0648\u0631\u0648\u062f \u0628\u0647 \u067e\u0646\u0644 \u0645\u062f\u06cc\u0631\u06cc\u062a \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062f.",

  invalidResponse:
    "\u0627\u0637\u0644\u0627\u0639\u0627\u062a \u0648\u0631\u0648\u062f \u0645\u062f\u06cc\u0631\u06cc\u062a \u062f\u0631\u06cc\u0627\u0641\u062a \u0646\u0634\u062f.",

  genericError:
    "\u062e\u0637\u0627 \u062f\u0631 \u0648\u0631\u0648\u062f \u0628\u0647 \u067e\u0646\u0644 \u0645\u062f\u06cc\u0631\u06cc\u062a.",
};

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
      return message.join("\u060c ");
    }
  }

  return TEXT.failed;
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

      const loginPayload = payload as {
  user?: {
    role?: unknown;
  };
} | null;

const role =
  typeof loginPayload?.user?.role ===
  "string"
    ? loginPayload.user.role
        .trim()
        .toLowerCase()
    : "";

if (!role) {
  throw new Error(
    TEXT.invalidResponse,
  );
}

      const params =
        new URLSearchParams(
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
          : TEXT.genericError,
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
          {TEXT.title}
        </h1>

        <p className="mt-3 text-sm leading-7 text-white/60">
          {TEXT.description}
        </p>

        <form
          className="mt-8 space-y-5"
          onSubmit={submit}
        >
          <label className="block">
            <span className="mb-2 block text-sm text-white/75">
              {TEXT.mobileLabel}
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
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-white/75">
              {TEXT.passwordLabel}
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
              placeholder="********"
              required
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm leading-7 text-red-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-amber-200 px-4 py-3 font-bold text-black transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy
              ? TEXT.loading
              : TEXT.submit}
          </button>
        </form>
      </section>
    </main>
  );
}
