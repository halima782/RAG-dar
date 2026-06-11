const API_BASE = import.meta.env.VITE_API_URL ?? "";

export async function setMessageVersion(messageId, versionIndex) {
  const response = await fetch(`${API_BASE}/api/messages/${messageId}/version`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version_index: versionIndex }),
  });

  if (!response.ok) {
    throw new Error(`Failed to switch version (${response.status})`);
  }

  return response.json();
}
