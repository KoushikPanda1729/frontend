const BASE = import.meta.env.VITE_API_URL || "/api";

function token() {
  return localStorage.getItem("hr_token");
}

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    localStorage.removeItem("hr_token");
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  if (res.status === 204) return null;
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

export const api = {
  login: (password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ password }) }),

  dashboardStats: () => request("/dashboard/stats"),

  candidates: () => request("/candidates"),
  candidate: (id) => request(`/candidates/${id}`),
  createCandidate: (data) => request("/candidates", { method: "POST", body: JSON.stringify(data) }),
  updateCandidate: (id, data) =>
    request(`/candidates/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteCandidate: (id) => request(`/candidates/${id}`, { method: "DELETE" }),
  uploadResume: (id, file, jobDescription) => {
    const form = new FormData();
    form.append("resume", file);
    if (jobDescription) form.append("jobDescription", jobDescription);
    return request(`/candidates/${id}/resume`, { method: "POST", body: form });
  },
  bulkUploadResumes: ({ roleAppliedFor, sector, jobDescription, source, files }) => {
    const form = new FormData();
    form.append("roleAppliedFor", roleAppliedFor);
    form.append("sector", sector);
    if (jobDescription) form.append("jobDescription", jobDescription);
    if (source) form.append("source", source);
    for (const file of files) form.append("resumes", file);
    return request("/candidates/upload", { method: "POST", body: form });
  },
  addInterview: (candidateId, data) =>
    request(`/candidates/${candidateId}/interviews`, { method: "POST", body: JSON.stringify(data) }),
  updateInterview: (interviewId, data) =>
    request(`/candidates/interviews/${interviewId}`, { method: "PATCH", body: JSON.stringify(data) }),
  addCandidateNote: (candidateId, data) =>
    request(`/candidates/${candidateId}/notes`, { method: "POST", body: JSON.stringify(data) }),

  employees: () => request("/employees"),
  employee: (id) => request(`/employees/${id}`),
  createEmployee: (data) => request("/employees", { method: "POST", body: JSON.stringify(data) }),
  hireFromCandidate: (candidateId, data) =>
    request(`/employees/from-candidate/${candidateId}`, { method: "POST", body: JSON.stringify(data) }),
  updateEmployee: (id, data) =>
    request(`/employees/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteEmployee: (id) => request(`/employees/${id}`, { method: "DELETE" }),
  uploadDocument: (employeeId, file, name) => {
    const form = new FormData();
    form.append("document", file);
    if (name) form.append("name", name);
    return request(`/employees/${employeeId}/documents`, { method: "POST", body: form });
  },
  deleteDocument: (docId) => request(`/employees/documents/${docId}`, { method: "DELETE" }),
  addEmployeeNote: (employeeId, data) =>
    request(`/employees/${employeeId}/notes`, { method: "POST", body: JSON.stringify(data) }),

  attendance: (employeeId, month) => request(`/employees/${employeeId}/attendance?month=${month}`),
  markAttendance: (employeeId, data) =>
    request(`/employees/${employeeId}/attendance`, { method: "PUT", body: JSON.stringify(data) }),
  clearAttendance: (employeeId, date) =>
    request(`/employees/${employeeId}/attendance/${date}`, { method: "DELETE" }),

  notes: () => request("/notes"),
  deleteNote: (id) => request(`/notes/${id}`, { method: "DELETE" }),

  generalNotes: () => request("/notes/general"),
  createGeneralNote: (data) => request("/notes/general", { method: "POST", body: JSON.stringify(data) }),
  updateGeneralNote: (id, data) =>
    request(`/notes/general/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  chatSessions: () => request("/chat/sessions"),
  createChatSession: () => request("/chat/sessions", { method: "POST" }),
  chatSession: (id) => request(`/chat/sessions/${id}`),
  renameChatSession: (id, title) =>
    request(`/chat/sessions/${id}`, { method: "PATCH", body: JSON.stringify({ title }) }),
  deleteChatSession: (id) => request(`/chat/sessions/${id}`, { method: "DELETE" }),

  fileUrl: (kind, id) => `${BASE}/files/${kind}/${id}`,
  async downloadFile(kind, id, filename) {
    const res = await fetch(`${BASE}/files/${kind}/${id}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "file";
    a.click();
    URL.revokeObjectURL(url);
  },
  token,
  baseUrl: BASE,
};
