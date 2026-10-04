// Cognivision Voice Intelligence - API Client Service

const BASE_URL = '';

async function fetchJson(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || err.error || `HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  // Health
  getHealth: () => fetchJson('/health'),

  // Dataset
  getDatasetSummary: () => fetchJson('/api/dataset/summary'),
  scanDataset: (directory) => fetchJson('/api/dataset/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ directory })
  }),
  createSplits: (val_ratio = 0.15, test_ratio = 0.15, random_seed = 42) => fetchJson('/api/dataset/create-splits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ val_ratio, test_ratio, random_seed })
  }),
  getSampleAudio: (limit = 50, emotion = null) => {
    const q = emotion ? `&emotion=${encodeURIComponent(emotion)}` : '';
    return fetchJson(`/api/dataset/sample-audio?limit=${limit}${q}`);
  },
  getAudioUrl: (fileName) => `/api/dataset/audio-file/${encodeURIComponent(fileName)}`,

  // Features
  extractFeatures: (max_samples = 1200, force_recompute = false) => fetchJson('/api/features/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ max_samples, force_recompute })
  }),
  get3dPCA: () => fetchJson('/api/features/pca-3d'),
  get3dAcoustic: () => fetchJson('/api/features/acoustic-3d'),
  getFeatureDistributions: () => fetchJson('/api/features/distributions'),

  // Training
  startTraining: (params) => fetchJson('/api/training/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  }),
  stopTraining: () => fetchJson('/api/training/stop', { method: 'POST' }),
  getTrainingStatus: () => fetchJson('/api/training/status'),
  getTrainingHistory: () => fetchJson('/api/training/history'),
  trainBaselines: () => fetchJson('/api/training/train-baselines', { method: 'POST' }),

  // Evaluation
  runEvaluation: (model_type = 'cnn', max_test_samples = null) => fetchJson('/api/evaluation/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model_type, max_test_samples })
  }),
  getLatestEvaluation: () => fetchJson('/api/evaluation/latest'),
  getLeaderboard: () => fetchJson('/api/evaluation/leaderboard'),
  getExplainability: () => fetchJson('/api/evaluation/explainability'),

  // Inference
  analyzeAudio: (formData) => {
    return fetch('/api/inference/analyze', {
      method: 'POST',
      body: formData
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || err.error || `Upload failed: ${res.status}`);
      }
      return res.json();
    });
  },
  getSenseVoiceStatus: () => fetchJson('/api/inference/sensevoice-status'),

  // Experiments & Operations
  runFullPipeline: (params) => fetchJson('/api/experiments/run-pipeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  }),
  getExperiments: () => fetchJson('/api/experiments'),
  getBenchmark: () => fetchJson('/api/benchmark'),
  getModels: () => fetchJson('/api/models'),
  getExportUrl: (type) => `/api/export/${type}`
};
