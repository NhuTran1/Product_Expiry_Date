import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

export function toStaticUrl(path) {
  if (!path) return null;

  if (path.startsWith("http")) return path;

  const normalized = path.replaceAll("\\", "/");

  if (normalized.startsWith("uploads/")) {
    return `${API_BASE_URL}/${normalized}`;
  }

  if (normalized.startsWith("outputs/")) {
    return `${API_BASE_URL}/${normalized}`;
  }

  if (normalized.startsWith("/uploads") || normalized.startsWith("/outputs")) {
    return `${API_BASE_URL}${normalized}`;
  }

  return `${API_BASE_URL}/${normalized}`;
}

export async function scanImage(file, sourceType = "upload") {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post(`/api/scan?source_type=${sourceType}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
}

export async function getScans(status = null, filters = {}) {
  const res = await api.get("/api/scans", {
    params: {
      ...(status ? { status } : {}),
      ...filters,
    },
  });
  return res.data;
}

export async function getReviewScans() {
  const res = await api.get("/api/scans/review");
  return res.data;
}

export async function getNearExpiryScans() {
  const res = await api.get("/api/scans/near-expiry");
  return res.data;
}

export async function getStats(filters = {}) {
  const res = await api.get("/api/stats", {
    params: filters,
  });
  return res.data;
}

export async function correctScan(id, correctedDate, reviewNote = "") {
  const res = await api.put(`/api/scans/${id}/correct`, {
    corrected_date: correctedDate,
    review_note: reviewNote,
  });

  return res.data;
}
