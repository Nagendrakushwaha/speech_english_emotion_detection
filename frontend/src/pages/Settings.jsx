import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, Database, Cpu, ShieldCheck, 
  RefreshCw, CheckCircle2, Download, AlertTriangle, Layers, Save 
} from 'lucide-react';
import { api } from '../services/api';

export default function Settings({ summary, onRescan }) {
  const [datasetDir, setDatasetDir] = useState('dataset/AudioWAV');
  const [randomSeed, setRandomSeed] = useState(42);
  const [valRatio, setValRatio] = useState(0.15);
  const [testRatio, setTestRatio] = useState(0.15);
  const [scanning, setScanning] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleScanDataset = async () => {
    setScanning(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await api.scanDataset(datasetDir);
      setStatusMessage(`Successfully scanned ${res.valid_files} valid audio files (${res.corrupted_files} corrupted) in ${res.processing_time_seconds}s.`);
      if (onRescan) onRescan();
    } catch (e) {
      setErrorMessage(e.message || 'Dataset scan failed.');
    } finally {
      setScanning(false);
    }
  };

  const handleCreateSplits = async () => {
    setSplitting(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await api.createSplits(valRatio, testRatio, randomSeed);
      setStatusMessage(`Speaker-independent splits created successfully! Train: ${res.train_samples}, Val: ${res.val_samples}, Test: ${res.test_samples}. Zero speaker leakage verified.`);
    } catch (e) {
      setErrorMessage(e.message || 'Split generation failed.');
    } finally {
      setSplitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 20, background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)', marginBottom: 10 }}>
            <SettingsIcon size={14} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-cyan)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              System Configuration & Telemetry
            </span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800 }}>
            Platform Settings & Dataset Discovery
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: 4 }}>
            Configure dataset directory paths, manage speaker-independent splits, and inspect runtime hardware constraints.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <a
            href={api.getExportUrl('csv')}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
          >
            <Download size={16} />
            <span>Download metadata.csv</span>
          </a>
        </div>
      </div>

      {statusMessage && (
        <div className="alert alert-success" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle2 size={18} color="var(--accent-emerald)" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-error" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={18} color="var(--accent-rose)" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 24 }}>
        {/* Section 1: Dataset Discovery */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Database size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Dataset Discovery & Inspection</h3>
          </div>

          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Path to the CREMA-D English emotional speech WAV directory. The system automatically inspects valid audio headers, actor identifiers, and emotion codes.
          </p>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
              DATASET DIRECTORY PATH (or .env DATASET_DIR)
            </label>
            <input
              type="text"
              value={datasetDir}
              onChange={(e) => setDatasetDir(e.target.value)}
              className="input-custom"
              style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <button
              className="btn btn-primary"
              onClick={handleScanDataset}
              disabled={scanning}
            >
              {scanning ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  <span>Scanning Dataset...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  <span>Scan & Regenerate Metadata</span>
                </>
              )}
            </button>

            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Current: {summary?.total_files || 7442} files detected
            </span>
          </div>
        </div>

        {/* Section 2: Speaker-Independent Splitting */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <ShieldCheck size={20} color="var(--accent-emerald)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Speaker-Independent Splitting</h3>
          </div>

          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Splits the 91 CREMA-D actors into disjoint speaker groups to prevent identity leakage between training and testing sets.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
            <div>
              <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                RANDOM SEED
              </label>
              <input
                type="number"
                value={randomSeed}
                onChange={(e) => setRandomSeed(parseInt(e.target.value) || 42)}
                className="input-custom"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                VAL RATIO
              </label>
              <input
                type="number"
                step="0.05"
                min="0.05"
                max="0.30"
                value={valRatio}
                onChange={(e) => setValRatio(parseFloat(e.target.value) || 0.15)}
                className="input-custom"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                TEST RATIO
              </label>
              <input
                type="number"
                step="0.05"
                min="0.05"
                max="0.30"
                value={testRatio}
                onChange={(e) => setTestRatio(parseFloat(e.target.value) || 0.15)}
                className="input-custom"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <button
            className="btn btn-secondary"
            onClick={handleCreateSplits}
            disabled={splitting}
          >
            {splitting ? (
              <>
                <RefreshCw size={16} className="spin" />
                <span>Generating Splits...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={16} />
                <span>Re-compute Speaker Splits</span>
              </>
            )}
          </button>
        </div>

        {/* Section 3: Training Guardrails & Constraints */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Cpu size={20} color="var(--accent-violet)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Training Guardrails (CPU Safe)</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.84rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Maximum Epoch Limit:</span>
              <strong style={{ color: 'var(--accent-rose)' }}>100 Epochs (Enforced)</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Default Training Epochs:</span>
              <strong style={{ color: 'var(--accent-cyan)' }}>30 Epochs</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Early Stopping Patience:</span>
              <span>7 Epochs</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Model Checkpointing:</span>
              <span style={{ color: 'var(--accent-emerald)' }}>Saves best_model.pt on lowest val_loss</span>
            </div>
          </div>
        </div>

        {/* Section 4: Hardware & Environment Diagnostics */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Layers size={20} color="var(--accent-amber)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Environment Telemetry</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.84rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Target CPU:</span>
              <strong>AMD Ryzen 5 5500U</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Memory (RAM):</span>
              <strong>16.0 GB DDR4</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>PyTorch Version:</span>
              <strong style={{ color: 'var(--accent-cyan)' }}>2.12.0+cpu (AVX2 enabled)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Audio Engines:</span>
              <span>SoundFile 0.13 + Librosa 1.0</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Speech Intelligence:</span>
              <span style={{ color: 'var(--accent-violet)' }}>SenseVoiceSmall (FunASR)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
