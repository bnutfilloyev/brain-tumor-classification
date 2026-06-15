import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";

export const api = axios.create({ baseURL });

// Static assets (uploads, gradcam) are served from the same origin proxy.
export const staticUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return path; // /static/... is proxied in dev and same-origin in prod
};

export const Patients = {
  list: (q) => api.get("/patients", { params: { q } }).then((r) => r.data),
  get: (id) => api.get(`/patients/${id}`).then((r) => r.data),
  create: (data) => api.post("/patients", data).then((r) => r.data),
  update: (id, data) => api.put(`/patients/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/patients/${id}`),
  history: (id) => api.get(`/patients/${id}/history`).then((r) => r.data),
};

export const Analyze = {
  run: (file, { patientId, save } = {}) => {
    const fd = new FormData();
    fd.append("file", file);
    if (patientId) fd.append("patient_id", patientId);
    fd.append("save", save ? "true" : "false");
    return api.post("/analyze", fd).then((r) => r.data);
  },
};

export const Studies = {
  save: (data) => api.post("/studies/save", data).then((r) => r.data),
};

export const AI = {
  summary: (data) => api.post("/ai/summary", data).then((r) => r.data),
  chat: (data) => api.post("/ai/chat", data).then((r) => r.data),
};

// Streaming helpers — call onChunk(textDelta) as tokens arrive.
async function streamPost(path, data, onChunk) {
  const res = await fetch(`${baseURL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    full += chunk;
    onChunk(full);
  }
  return full;
}

export const AIStream = {
  summary: (data, onChunk) => streamPost("/ai/summary/stream", data, onChunk),
  chat: (data, onChunk) => streamPost("/ai/chat/stream", data, onChunk),
};

export const Metrics = {
  performance: () => api.get("/metrics/performance").then((r) => r.data),
  dataset: () => api.get("/metrics/dataset").then((r) => r.data),
  training: () => api.get("/metrics/training").then((r) => r.data),
  embedding: () => api.get("/metrics/embedding").then((r) => r.data),
  validation: () => api.get("/metrics/validation").then((r) => r.data),
  misclassified: () => api.get("/metrics/misclassified").then((r) => r.data),
  modelcard: () => api.get("/metrics/modelcard").then((r) => r.data),
  overview: () => api.get("/metrics/overview").then((r) => r.data),
};
