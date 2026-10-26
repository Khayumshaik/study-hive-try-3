const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function fetchStudyGroups() {
  const res = await fetch(`${API_URL}/groups/`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch study groups");
  return res.json();
}

export async function createStudyGroup(group: { name: string; description?: string; subject: string; created_by: string }) {
  const res = await fetch(`${API_URL}/groups/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(group),
  });
  if (!res.ok) throw new Error("Failed to create study group");
  return res.json();
}