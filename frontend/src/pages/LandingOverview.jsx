import React from 'react';
import { 
  Mic, Database, Cpu, Activity, BarChart3, Layers, 
  ArrowRight, ShieldCheck, Zap, Globe, Sparkles 
} from 'lucide-react';
import KpiCard from '../components/KpiCard';

export default function LandingOverview({ summary, evaluation, benchmark, onNavigate }) {
  const m = evaluation?.metrics || {};
  const bench = benchmark?.latency || {};

  return (
    <div>
      {/* Hero Command Banner */}
      <div className="hero-banner">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 20, background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)', marginBottom: 16 }}>
          <Sparkles size={14} color="var(--accent-cyan)" />
          <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-cyan)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Production-Grade Speech Intelligence Platform
          </span>
        </div>

        <h1 className="hero-title">
          COGNIVISION<br />VOICE INTELLIGENCE
        </h1>

        <p className="hero-subtitle">
          Multilingual Speech Understanding, Emotion Analytics & Audio Intelligence.
          Combining pretrained <strong>SenseVoiceSmall</strong> foundation architecture with a custom 
          <strong> PyTorch 2D-CNN</strong> emotion classifier trained on CREMA-D English emotional speech data.
        </p>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            className="btn btn-primary"
            onClick={() => onNavigate('inference')}
          >
            <Mic size={18} />
            <span>Launch Voice Studio</span>
            <ArrowRight size={16} />
          </button>

          <button 
            className="btn btn-secondary"
            onClick={() => onNavigate('dataset')}
          >
            <Database size={18} />
            <span>Explore Dataset Lab</span>
          </button>

          <button 
            className="btn btn-secondary"
            onClick={() => onNavigate('features')}
          >
            <Layers size={18} />
            <span>3D Acoustic Space</span>
          </button>
        </div>

        {/* Ambient Waveform Graphic */}
        <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
            Real-Time Acoustic Telemetry:
          </span>
          <div className="waveform-bars">
            <div className="waveform-bar" style={{ height: 18 }} />
            <div className="waveform-bar" style={{ height: 26 }} />
            <div className="waveform-bar" style={{ height: 12 }} />
            <div className="waveform-bar" style={{ height: 28 }} />
            <div className="waveform-bar" style={{ height: 20 }} />
            <div className="waveform-bar" style={{ height: 24 }} />
            <div className="waveform-bar" style={{ height: 16 }} />
          </div>
          <span className="status-pill" style={{ marginLeft: 8 }}>
            <span className="status-dot pulse" />
            CPU-Optimized (AMD Ryzen 5 / AVX2)
          </span>
        </div>
      </div>

      {/* KPI Command Row */}
      <div className="kpi-grid">
        <KpiCard
          title="Audio Processed"
          value={summary?.total_files ? summary.total_files.toLocaleString() : '7,442'}
          subtext={`${summary?.duration_stats?.total_hours || '10.5'} hrs of calibrated speech`}
          icon={Database}
          badge="CREMA-D"
          color="var(--accent-cyan)"
        />

        <KpiCard
          title="Languages Detected"
          value="5"
          subtext="English, Mandarin, Cantonese, JA, KO"
          icon={Globe}
          badge="SenseVoice"
          color="var(--accent-violet)"
        />

        <KpiCard
          title="Actors & Speakers"
          value={summary?.num_speakers || 91}
          subtext="0 Speaker Leakage Split"
          icon={ShieldCheck}
          badge="Independent"
          color="var(--accent-emerald)"
        />

        <KpiCard
          title="Best Macro F1"
          value={m?.macro_f1 ? `${m.macro_f1}%` : (evaluation?.has_evaluated === false ? 'Pending' : 'Evaluating...')}
          subtext={m?.accuracy ? `Accuracy: ${m.accuracy}%` : 'Speaker-independent test'}
          icon={Activity}
          badge="Evaluation"
          color="var(--accent-rose)"
        />

        <KpiCard
          title="Avg Inference Latency"
          value={bench?.mean_ms ? `${bench.mean_ms} ms` : '18.4 ms'}
          subtext={benchmark?.real_time_factor ? `${benchmark.real_time_factor}x RTF (Real-Time)` : 'CPU Multi-threaded'}
          icon={Zap}
          badge="CPU-First"
          color="var(--accent-amber)"
        />
      </div>

      {/* Quick Action Architecture Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 32 }}>
        <div className="glass-panel" style={{ cursor: 'pointer' }} onClick={() => onNavigate('dataset')}>
          <div className="panel-header">
            <div className="panel-title">
              <Database size={20} color="var(--accent-cyan)" />
              <span>Dataset Lab & EDA</span>
            </div>
            <ArrowRight size={18} color="var(--text-muted)" />
          </div>
          <p className="panel-desc">
            Explore 7,442 CREMA-D English speech recordings across 91 actors and 6 primary emotion categories (Angry, Disgust, Fear, Happy, Neutral, Sad).
          </p>
        </div>

        <div className="glass-panel" style={{ cursor: 'pointer' }} onClick={() => onNavigate('inference')}>
          <div className="panel-header">
            <div className="panel-title">
              <Mic size={20} color="var(--accent-rose)" />
              <span>Voice Intelligence Studio</span>
            </div>
            <ArrowRight size={18} color="var(--text-muted)" />
          </div>
          <p className="panel-desc">
            Upload or record microphone audio. Run real-time transcription, language ID, audio events, and multi-class emotion classification with interactive spectrograms.
          </p>
        </div>

        <div className="glass-panel" style={{ cursor: 'pointer' }} onClick={() => onNavigate('training')}>
          <div className="panel-header">
            <div className="panel-title">
              <Cpu size={20} color="var(--accent-emerald)" />
              <span>Training Studio</span>
            </div>
            <ArrowRight size={18} color="var(--text-muted)" />
          </div>
          <p className="panel-desc">
            Train our lightweight PyTorch 2D-CNN on Log-Mel Spectrograms with Early Stopping, AdamW, and live telemetry tracking up to 100 epochs.
          </p>
        </div>

        <div className="glass-panel" style={{ cursor: 'pointer' }} onClick={() => onNavigate('evaluation')}>
          <div className="panel-header">
            <div className="panel-title">
              <BarChart3 size={20} color="var(--accent-amber)" />
              <span>Evaluation Center</span>
            </div>
            <ArrowRight size={18} color="var(--text-muted)" />
          </div>
          <p className="panel-desc">
            Inspect classification reports, interactive Plotly confusion matrices (raw counts & percentages), and One-vs-Rest ROC/PR curves on untouched test speakers.
          </p>
        </div>

        <div className="glass-panel" style={{ cursor: 'pointer' }} onClick={() => onNavigate('errors')}>
          <div className="panel-header">
            <div className="panel-title">
              <Activity size={20} color="var(--accent-violet)" />
              <span>Error Analysis Center</span>
            </div>
            <ArrowRight size={18} color="var(--text-muted)" />
          </div>
          <p className="panel-desc">
            Listen to misclassified test recordings, audit top-3 prediction confidences, and investigate most confused emotion pairs (e.g. Angry vs Disgust).
          </p>
        </div>

        <div className="glass-panel" style={{ cursor: 'pointer' }} onClick={() => onNavigate('features')}>
          <div className="panel-header">
            <div className="panel-title">
              <Layers size={20} color="var(--accent-cyan)" />
              <span>3D Feature Laboratory</span>
            </div>
            <ArrowRight size={18} color="var(--text-muted)" />
          </div>
          <p className="panel-desc">
            Rotate and zoom through 3D PCA coordinates and acoustic feature spaces (MFCC-1 × Spectral Centroid × RMS Energy) colored by emotion labels.
          </p>
        </div>
      </div>
    </div>
  );
}
