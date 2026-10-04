import React, { useState, useEffect } from 'react';
import { 
  Cpu, Layers, Award, BarChart3, Globe, ShieldCheck, 
  ExternalLink, Sparkles, Activity, FileText, CheckCircle2 
} from 'lucide-react';
import PlotlyChart from '../components/PlotlyChart';
import { api } from '../services/api';

export default function ModelLaboratory({ evaluation }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [explainability, setExplainability] = useState(null);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadModelLabData();
  }, []);

  const loadModelLabData = async () => {
    setLoading(true);
    try {
      const [lbRes, expRes, modelsRes] = await Promise.all([
        api.getLeaderboard().catch(() => ({ leaderboard: [] })),
        api.getExplainability().catch(() => null),
        api.getModels().catch(() => ({ models: [] }))
      ]);
      setLeaderboard(lbRes.leaderboard || []);
      setExplainability(expRes);
      setModels(modelsRes.models || []);
    } catch (e) {
      console.error('Failed to load model lab data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Leaderboard comparison chart data
  const validModels = leaderboard.filter(m => typeof m.accuracy === 'number');
  const comparisonChartData = [
    {
      x: validModels.map(m => m.model),
      y: validModels.map(m => m.accuracy),
      name: 'Test Accuracy (%)',
      type: 'bar',
      marker: { color: '#06b6d4' }
    },
    {
      x: validModels.map(m => m.model),
      y: validModels.map(m => m.macro_f1),
      name: 'Macro F1 (%)',
      type: 'bar',
      marker: { color: '#8b5cf6' }
    }
  ];

  // Feature Importance Horizontal Bar Data
  const featList = explainability?.feature_importances || [];
  const featChartData = [{
    y: featList.slice(0, 12).map(f => f.feature).reverse(),
    x: featList.slice(0, 12).map(f => f.importance * 100).reverse(),
    type: 'bar',
    orientation: 'h',
    marker: {
      color: '#10b981',
      line: { color: 'rgba(255, 255, 255, 0.2)', width: 1 }
    },
    hoverinfo: 'x+y'
  }];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 20, background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)', marginBottom: 10 }}>
            <Cpu size={14} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Architectural Specifications & Leaderboard
            </span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800 }}>
            Model Laboratory & Architecture Explorer
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: 4 }}>
            In-depth architectural comparison between our custom CPU-trained PyTorch 2D-CNN, classical ML baselines, and Alibaba FunASR SenseVoiceSmall.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <span className="status-pill">
            <span className="status-dot pulse" />
            PyTorch 2.12 (CPU / AVX2)
          </span>
        </div>
      </div>

      {/* Model Architecture Deep-Dive Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, marginBottom: 28 }}>
        {/* Model 1: Custom PyTorch 2D-CNN */}
        <div className="card" style={{ border: '1px solid rgba(6, 182, 212, 0.35)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <span className="badge badge-cyan" style={{ fontSize: '0.7rem', marginBottom: 6, display: 'inline-block' }}>
                Primary Production Model
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Cognivision 2D-CNN</h3>
            </div>
            <Cpu size={24} color="var(--accent-cyan)" />
          </div>

          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Custom deep convolutional neural network designed specifically for low-latency CPU speech emotion classification on 64-band Log-Mel spectrograms.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.82rem', background: 'rgba(0, 0, 0, 0.25)', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Input Dimensions:</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>1 x 64 x 94 (Mel-Spec)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Trainable Parameters:</span>
              <strong style={{ color: 'var(--accent-cyan)' }}>89,734 weights</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Disk / RAM Footprint:</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>368 KB (0.34 MB)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Regularization:</span>
              <span>BatchNorm2D + Dropout (0.25)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Optimization:</span>
              <span>Adam (lr=1e-3, weight_decay=1e-4)</span>
            </div>
          </div>
        </div>

        {/* Model 2: SenseVoiceSmall */}
        <div className="card" style={{ border: '1px solid rgba(139, 92, 246, 0.35)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <span className="badge badge-purple" style={{ fontSize: '0.7rem', marginBottom: 6, display: 'inline-block' }}>
                Pretrained Foundation Speech Model
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>SenseVoiceSmall (FunASR)</h3>
            </div>
            <Globe size={24} color="var(--accent-violet)" />
          </div>

          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Alibaba FunASR speech foundation model capable of joint ASR, language identification (LID), emotion recognition (SER), and audio event detection.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.82rem', background: 'rgba(0, 0, 0, 0.25)', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Supported Languages:</span>
              <strong style={{ color: 'var(--accent-violet)' }}>English, ZH, YUE, JA, KO</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Architecture:</span>
              <span>Speech Transformer Encoder</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Model Size:</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>~936 MB (Float32)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Audio Sampling:</span>
              <span>16,000 Hz Mono</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Official Source:</span>
              <a href="https://github.com/modelscope/FunASR" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                GitHub <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>

        {/* Model 3: Classical ML Baselines */}
        <div className="card" style={{ border: '1px solid rgba(16, 185, 129, 0.35)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <span className="badge badge-green" style={{ fontSize: '0.7rem', marginBottom: 6, display: 'inline-block' }}>
                Statistical Baselines
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Classical Acoustic Ensemble</h3>
            </div>
            <Award size={24} color="var(--accent-emerald)" />
          </div>

          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Suite of classical algorithms trained on 40 extracted acoustic features (RMS, ZCR, Spectral Centroid, Bandwidth, Contrast, and MFCCs 1–13).
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.82rem', background: 'rgba(0, 0, 0, 0.25)', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Logistic Regression:</span>
              <span>StandardScaler + C=1.0 Pipeline</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Random Forest:</span>
              <span>100 trees, max_depth=12</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Support Vector Machine:</span>
              <span>RBF kernel, C=2.0</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>CPU Inference Speed:</span>
              <strong style={{ color: 'var(--accent-emerald)' }}>&lt; 5 ms per audio clip</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Feature Dimension:</span>
              <span>40 Acoustic Descriptors</span>
            </div>
          </div>
        </div>
      </div>

      {/* Model Leaderboard Section */}
      <div className="card" style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 6 }}>
          Model Performance Leaderboard
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: 18 }}>
          Rigorous benchmarking on untouched speaker-independent test split with zero speaker leakage.
        </p>

        <div style={{ overflowX: 'auto', marginBottom: 20 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Architecture</th>
                <th>Accuracy</th>
                <th>Macro F1</th>
                <th>Weighted F1</th>
                <th>Latency (ms)</th>
                <th>Size (MB)</th>
                <th>CPU Footprint</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, idx) => (
                <tr key={idx} style={{ background: row.model.includes('CNN') ? 'rgba(6, 182, 212, 0.08)' : 'transparent' }}>
                  <td style={{ fontWeight: 700 }}>
                    {row.model}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {row.architecture}
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {typeof row.accuracy === 'number' ? `${row.accuracy}%` : row.accuracy}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--accent-violet)' }}>
                    {typeof row.macro_f1 === 'number' ? `${row.macro_f1}%` : row.macro_f1}
                  </td>
                  <td>
                    {typeof row.weighted_f1 === 'number' ? `${row.weighted_f1}%` : row.weighted_f1}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>
                    {row.inference_time_ms} ms
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>
                    {row.model_size_mb} MB
                  </td>
                  <td>
                    <span className="badge badge-purple" style={{ fontSize: '0.72rem' }}>
                      {row.cpu_usage}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {validModels.length > 0 && (
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12 }}>
              Benchmark Accuracy & Macro F1 Comparison
            </h4>
            <PlotlyChart
              data={comparisonChartData}
              layout={{
                barmode: 'group',
                yaxis: { title: 'Percentage (%)', range: [0, 60] },
                margin: { t: 20, r: 20, b: 40, l: 45 }
              }}
              style={{ height: 260 }}
            />
          </div>
        )}
      </div>

      {/* Feature Explainability Section */}
      <div className="card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 6 }}>
          Acoustic Explainability & Feature Importance
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: 18 }}>
          Random Forest Mean Decrease in Impurity (MDI) analysis across all 40 extracted time-domain, spectral, and MFCC features.
        </p>

        {featList.length > 0 ? (
          <PlotlyChart
            data={featChartData}
            layout={{
              xaxis: { title: 'Importance (%)' },
              margin: { t: 15, r: 25, b: 40, l: 160 }
            }}
            style={{ height: 320 }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            Loading feature importance metrics...
          </div>
        )}
      </div>
    </div>
  );
}
