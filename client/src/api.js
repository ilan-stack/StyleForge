const BASE = "/api";

async function request(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      msg = data.error || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function fetchProjects() {
  return request(`${BASE}/projects`);
}

export async function createProject(name, triggerWord) {
  return request(`${BASE}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, triggerWord }),
  });
}

export async function getProject(id) {
  return request(`${BASE}/projects/${id}`);
}

export async function uploadImages(projectId, files) {
  const fd = new FormData();
  for (const f of files) fd.append("images", f);
  return request(`${BASE}/projects/${projectId}/images`, {
    method: "POST",
    body: fd,
  });
}

export async function deleteImage(projectId, filename) {
  return request(`${BASE}/projects/${projectId}/images/${filename}`, {
    method: "DELETE",
  });
}

export async function fetchTrainers() {
  return request(`${BASE}/trainers`);
}

export async function startTraining(projectId, trainerId) {
  return request(`${BASE}/projects/${projectId}/train`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trainer: trainerId }),
  });
}

export async function getTrainingStatus(projectId) {
  return request(`${BASE}/projects/${projectId}/training/status`);
}

export async function deleteGeneration(projectId, genId) {
  return request(`${BASE}/projects/${projectId}/generations/${genId}`, {
    method: "DELETE",
  });
}

export async function deleteProject(projectId) {
  return request(`${BASE}/projects/${projectId}`, {
    method: "DELETE",
  });
}

export async function generateImages(projectId, prompt, options = {}) {
  return request(`${BASE}/projects/${projectId}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, ...options }),
  });
}
