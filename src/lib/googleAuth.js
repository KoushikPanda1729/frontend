import { api } from "./api";

export function connectUrl() {
  return `${api.baseUrl}/google/connect`;
}

export async function listAccounts() {
  const res = await fetch(`${api.baseUrl}/google/accounts`, {
    headers: { Authorization: `Bearer ${api.token()}` },
  });
  if (!res.ok) throw new Error("Failed to load connected Google accounts");
  return res.json();
}

export async function disconnectAccount(id) {
  const res = await fetch(`${api.baseUrl}/google/accounts/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${api.token()}` },
  });
  if (!res.ok) throw new Error("Failed to disconnect");
}

// Real spreadsheets from one connected account's Drive, listed server-side — no client-only API key involved.
export async function listSpreadsheets(accountId) {
  const res = await fetch(`${api.baseUrl}/google/accounts/${accountId}/spreadsheets`, {
    headers: { Authorization: `Bearer ${api.token()}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to list Drive spreadsheets");
  }
  return res.json();
}

export async function createSpreadsheet(accountId, title) {
  const res = await fetch(`${api.baseUrl}/google/accounts/${accountId}/create-sheet`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${api.token()}`,
    },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create sheet");
  }
  return res.json();
}
