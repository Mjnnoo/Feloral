"use client";

/**
 * Sends a same-origin request to an authenticated admin BFF route.
 * If the admin access cookie has expired, the refresh endpoint is called once
 * and the original request is retried.
 */
export async function adminFetch(
  input: string | URL,
  init: RequestInit = {},
): Promise<Response> {
  const run = () =>
    fetch(input, {
      ...init,
      credentials: "include",
      cache: init.cache ?? "no-store",
    });

  let response = await run();

  if (response.status !== 401) {
    return response;
  }

  const refreshResponse = await fetch("/api/admin/refresh", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  });

  if (!refreshResponse.ok) {
    return response;
  }

  response = await run();
  return response;
}
