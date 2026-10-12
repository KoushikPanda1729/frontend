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
  login: (username, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),

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
  uploadDocument: (employeeId, file, name, expiryDate) => {
    const form = new FormData();
    form.append("document", file);
    if (name) form.append("name", name);
    if (expiryDate) form.append("expiryDate", expiryDate);
    return request(`/employees/${employeeId}/documents`, { method: "POST", body: form });
  },
  deleteDocument: (docId) => request(`/employees/documents/${docId}`, { method: "DELETE" }),
  addEmployeeNote: (employeeId, data) =>
    request(`/employees/${employeeId}/notes`, { method: "POST", body: JSON.stringify(data) }),

  orgChart: () => request("/employees/org-chart"),
  savedOrgCharts: () => request("/employees/org-chart/saved"),
  savedOrgChart: (id) => request(`/employees/org-chart/saved/${id}`),
  generateOrgChart: (name, prompt) =>
    request("/employees/org-chart/generate", { method: "POST", body: JSON.stringify({ name, prompt }) }),
  deleteSavedOrgChart: (id) => request(`/employees/org-chart/saved/${id}`, { method: "DELETE" }),
  updateSavedOrgChartNode: (id, nodeId, data) =>
    request(`/employees/org-chart/saved/${id}/nodes/${nodeId}`, { method: "PATCH", body: JSON.stringify(data) }),
  setSavedOrgChartEdges: (id, edges) =>
    request(`/employees/org-chart/saved/${id}/edges`, { method: "PATCH", body: JSON.stringify({ edges }) }),
  upcomingDates: () => request("/employees/upcoming-dates"),
  expiringDocuments: () => request("/employees/expiring-documents"),

  generatePayslip: (employeeId, data) =>
    request(`/employees/${employeeId}/payslips`, { method: "POST", body: JSON.stringify(data) }),
  async downloadPayslip(payslipId, filename) {
    const res = await fetch(`${BASE}/employees/payslips/${payslipId}/download`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "payslip.html";
    a.click();
    URL.revokeObjectURL(url);
  },

  addReview: (employeeId, data) => request(`/employees/${employeeId}/reviews`, { method: "POST", body: JSON.stringify(data) }),
  updateReview: (reviewId, data) => request(`/employees/reviews/${reviewId}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteReview: (reviewId) => request(`/employees/reviews/${reviewId}`, { method: "DELETE" }),

  startOffboarding: (employeeId) => request(`/employees/${employeeId}/offboarding/start`, { method: "POST" }),
  addOffboardingTask: (employeeId, label) =>
    request(`/employees/${employeeId}/offboarding`, { method: "POST", body: JSON.stringify({ label }) }),
  toggleOffboardingTask: (taskId, done) =>
    request(`/employees/offboarding/${taskId}`, { method: "PATCH", body: JSON.stringify({ done }) }),
  deleteOffboardingTask: (taskId) => request(`/employees/offboarding/${taskId}`, { method: "DELETE" }),

  employeeShifts: (employeeId) => request(`/employees/${employeeId}/shifts`),
  setShift: (employeeId, data) => request(`/employees/${employeeId}/shifts`, { method: "PUT", body: JSON.stringify(data) }),
  deleteShift: (employeeId, date) => request(`/employees/${employeeId}/shifts/${date}`, { method: "DELETE" }),
  allShifts: (start, end) => request(`/employees/shifts/all?start=${start}&end=${end}`),

  holidays: () => request("/holidays"),
  addHoliday: (data) => request("/holidays", { method: "POST", body: JSON.stringify(data) }),
  deleteHoliday: (id) => request(`/holidays/${id}`, { method: "DELETE" }),

  auditLog: () => request("/audit-log"),

  publicJobs: () => request("/jobs"),
  adminJobs: () => request("/jobs/admin/all"),
  createJob: (data) => request("/jobs", { method: "POST", body: JSON.stringify(data) }),
  updateJob: (id, data) => request(`/jobs/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteJob: (id) => request(`/jobs/${id}`, { method: "DELETE" }),
  applyToJob: (id, { name, email, phone, resume }) => {
    const form = new FormData();
    form.append("name", name);
    if (email) form.append("email", email);
    if (phone) form.append("phone", phone);
    form.append("resume", resume);
    return request(`/jobs/${id}/apply`, { method: "POST", body: form });
  },

  employeesExportUrl: () => `${BASE}/employees/export.csv`,
  candidatesExportUrl: () => `${BASE}/candidates/export.csv`,
  async downloadCsv(url, filename) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(objUrl);
  },

  attendanceDay: (date) => request(`/employees/attendance/day?date=${date}`),
  markAttendanceDay: (date, records) =>
    request(`/employees/attendance/day`, { method: "PUT", body: JSON.stringify({ date, records }) }),

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

  sheets: () => request("/sheets"),
  createSheet: (data) => request("/sheets", { method: "POST", body: JSON.stringify(data) }),
  updateSheet: (id, data) => request(`/sheets/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteSheet: (id) => request(`/sheets/${id}`, { method: "DELETE" }),

  publicLeaveInfo: (employeeId) => request(`/leave-requests/public/${employeeId}`),
  submitLeaveRequest: (employeeId, data) =>
    request(`/leave-requests/public/${employeeId}`, { method: "POST", body: JSON.stringify(data) }),
  leaveRequests: (status) => request(`/leave-requests${status ? `?status=${status}` : ""}`),
  reviewLeaveRequest: (id, data) => request(`/leave-requests/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

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
