/* ═══════════════════════════════════════════════════════════════════════════
   API Client — connects frontend to the Express backend
   ═══════════════════════════════════════════════════════════════════════════ */

const API_BASE = import.meta.env.VITE_API_URL || "";

async function request(path, options = {}) {
  const { method = "GET", body, role = "admin" } = options;
  const headers = { "Content-Type": "application/json" };

  // Dev mode: pass role header for auth bypass
  if (import.meta.env.DEV) {
    headers["X-Dev-Role"] = role;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: "include",
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message || "API error");
  return data.data;
}

// ── Properties ──────────────────────────────────────────────────────────────
export const fetchProperties = () => request("/api/v1/properties");
export const fetchProperty = (id) => request(`/api/v1/properties/${id}`);
export const createProperty = (body) => request("/api/v1/properties", { method: "POST", body });

// ── Investments ─────────────────────────────────────────────────────────────
export const fetchInvestments = (params = "") => request(`/api/v1/investments${params ? `?${params}` : ""}`);

// ── Users ───────────────────────────────────────────────────────────────────
export const fetchUsers = () => request("/api/v1/users");
export const createUser = (body) => request("/api/v1/users", { method: "POST", body });

// ── Distributions ───────────────────────────────────────────────────────────
export const fetchDistributions = () => request("/api/v1/distributions");

// ── Reports ─────────────────────────────────────────────────────────────────
export const fetchReports = (role = "admin") => request("/api/v1/reports", { role });
export const fetchReport = (id) => request(`/api/v1/reports/${id}`);
export const createReport = (body) => request("/api/v1/reports", { method: "POST", body });
export const publishReport = (id) => request(`/api/v1/reports/${id}/publish`, { method: "POST" });
export const createExpense = (reportId, body) => request(`/api/v1/reports/${reportId}/expenses`, { method: "POST", body });

// ── Dashboard ───────────────────────────────────────────────────────────────
export const fetchAdminDashboard = () => request("/api/v1/dashboard/admin");
export const fetchInvestorDashboard = () => request("/api/v1/dashboard/investor", { role: "investor" });

// ── Documents ───────────────────────────────────────────────────────────────
export const fetchDocuments = (role = "admin") => request("/api/v1/documents", { role });

// ── Exports ─────────────────────────────────────────────────────────────────
export const exportInvestorsCSV = () =>
  fetch(`${API_BASE}/api/v1/exports/investors`, { headers: { "X-Dev-Role": "admin" } }).then(r => r.text());

// ── Offerings ───────────────────────────────────────────────────────────────
export const fetchOfferings = (role = "admin") => request("/api/v1/offerings", { role });
export const fetchOffering = (id, role = "admin") => request(`/api/v1/offerings/${id}`, { role });
export const createOffering = (body) => request("/api/v1/offerings", { method: "POST", body });
export const updateOffering = (id, body) => request(`/api/v1/offerings/${id}`, { method: "PATCH", body });

// ── LOIs ────────────────────────────────────────────────────────────────────
export const fetchOfferingLOIs = (offeringId) => request(`/api/v1/offerings/${offeringId}/lois`);
export const submitLOI = (offeringId, body) => request(`/api/v1/offerings/${offeringId}/lois`, { method: "POST", body, role: "investor" });
export const updateLOIStatus = (offeringId, loiId, body) => request(`/api/v1/offerings/${offeringId}/lois/${loiId}`, { method: "PATCH", body });

// ── Funds ───────────────────────────────────────────────────────────────────
export const fetchFunds = () => request("/api/v1/funds");
export const fetchFund = (id) => request(`/api/v1/funds/${id}`);
export const createFund = (body) => request("/api/v1/funds", { method: "POST", body });
export const updateFund = (id, body) => request(`/api/v1/funds/${id}`, { method: "PATCH", body });
export const addFundProperties = (id, body) =>
  request(`/api/v1/funds/${id}/properties`, { method: "POST", body });
export const removeFundProperty = (id, propertyId) =>
  request(`/api/v1/funds/${id}/properties/${propertyId}`, { method: "DELETE" });
export const fetchFundInvestments = (id) => request(`/api/v1/funds/${id}/investments`);
export const createFundInvestment = (id, body) =>
  request(`/api/v1/funds/${id}/investments`, { method: "POST", body });
export const fetchFundReports = (id) => request(`/api/v1/funds/${id}/reports`);
export const fetchFundReport = (id, reportId) =>
  request(`/api/v1/funds/${id}/reports/${reportId}`);
export const createFundReport = (id, body) =>
  request(`/api/v1/funds/${id}/reports`, { method: "POST", body });
export const publishFundReport = (id, reportId) =>
  request(`/api/v1/funds/${id}/reports/${reportId}/publish`, { method: "POST" });
export const createFundDistributions = (id, body) =>
  request(`/api/v1/funds/${id}/distributions`, { method: "POST", body });
export const fetchFundDistributions = (id) => request(`/api/v1/funds/${id}/distributions`);
