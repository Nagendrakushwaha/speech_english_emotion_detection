import React, { useState, useEffect } from 'react';
import { 
  History, Play, CheckCircle2, AlertTriangle, RefreshCw, 
  Layers, Download, Cpu, HardDrive, Sparkles, Clock, ArrowRight 
} from 'lucide-react';
import PlotlyChart from '../components/PlotlyChart';
import { api } from '../services/api';

export default function ExperimentHistory({ onPipelineComplete }) {
  const [experiments, setExperiments] = useState([]);
  const [models, setModels] = useState([]);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineParams, setPipelineParams] = useState({
    epochs: 15,
    batch_size: 32,
    max_samples: 1200,
    random_seed: 42
  });
  const [pipelineLogs, setPipelineLogs] = useState([]);
  const [pipelineResult, setPipelineResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const [expRes, modRes] = await Promise.all([
        api.getExperiments().catch(() => ({ experiments: [] })),
        api.getModels().catch(() => ({ models: [] }))
      ]);
      setExperiments(expRes.experiments || []);
      setModels(modRes.models || []);
    } catch (e) {
      console.error('Failed to load experiment history:', e);
    }
  };

  const handleRunCompletePipeline = async () => {
    setPipelineRunning(true);
    setError(null);
    setPipelineLogs(['Initializing End-to-End Automated Pipeline...']);
    setPipelineResult(null);

    try {
      const res = await api.runFullPipeline(pipelineParams);
      setPipelineResult(res);
      setPipelineLogs(res.steps || ['Completed successfully!']);
      await loadHistory();
      if (onPipelineComplete) onPipelineComplete();
    } catch (e) {
      setError(e.message || 'Pipeline execution failed.');
    } finally {
      setPipelineRunning(false);
    }
  };

  // Plotly chart of experiments vs Accuracy and F1
  const sortedExps = [...experiments].reverse();
  const expChartData = [
    {
      x: sortedExps.map(e => e.experiment_id || e.timestamp),
      y: sortedExps.map(e => e.test_accuracy || 0),
      name: 'Test Accuracy (%)',
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: '#06b6d4', width: 2 },
      marker: { color: '#38bdf8', size: 7 }
    },
    {
      x: sortedExps.map(e => e.experiment_id || e.timestamp),
      y: sortedExps.map(e => e.macro_f1 || 0),
      name: 'Macro F1 (%)',
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: '#8b5cf6', width: 2 },
      marker: { color: '#a78bfa', size: 7 }
    }
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 20, background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', marginBottom: 10 }}>
            <History size={14} color="var(--accent-emerald)" />
            <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--accent-emerald)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Experiment Tracking & Model Registry
            </span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800 }}>
            Experiment History & One-Click MLOps
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: 4 }}>
            Track previous model runs, inspect parameter configs, manage the local model registry, or execute the complete end-to-end pipeline in one automated click.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-primary"
            onClick={handleRunCompletePipeline}
            disabled={pipelineRunning}
          >
            {pipelineRunning ? (
              <>
                <RefreshCw size={16} className="spin" />
                <span>Pipeline Running...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Run Complete Pipeline</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* One-Click Automated Pipeline Command Center */}
      <div className="card" style={{ marginBottom: 28, border: '1px solid rgba(16, 185, 129, 0.35)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
              ⚡ One-Click End-to-End Experiment Execution
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              Executes: 1. Scan $\to$ 2. Splits $\to$ 3. Features $\to$ 4. Baselines $\to$ 5. CNN Training $\to$ 6. Evaluation $\to$ 7. Benchmark $\to$ 8. Registry Log.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              Epochs:
              <input
                type="number"
                min="1"
                max="100"
                value={pipelineParams.epochs}
                onChange={(e) => setPipelineParams({ ...pipelineParams, epochs: parseInt(e.target.value) || 15 })}
                className="input-custom"
                style={{ width: 70, padding: '4px 8px', fontSize: '0.8rem' }}
              />
            </label>

            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              Max Samples:
              <input
                type="number"
                min="200"
                max="7442"
                step="200"
                value={pipelineParams.max_samples}
                onChange={(e) => setPipelineParams({ ...pipelineParams, max_samples: parseInt(e.target.value) || 1200 })}
                className="input-custom"
                style={{ width: 90, padding: '4px 8px', fontSize: '0.8rem' }}
              />
            </label>
          </div>
        </div>

        {/* Live Pipeline Telemetry Log */}
        {pipelineLogs.length > 0 && (
          <div style={{ marginTop: 14, padding: '14px 18px', borderRadius: 'var(--radius-md)', background: '#070a12', border: '1px solid rgba(255, 255, 255, 0.08)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: 'var(--text-muted)' }}>
              <span>PIPELINE LOG OUTPUT:</span>
              {pipelineRunning && <span className="status-dot pulse" />}
            </div>
            {pipelineLogs.map((log, idx) => (
              <div key={idx} style={{ color: log.includes('1.') || log.includes('2.') || log.includes('3.') || log.includes('4.') || log.includes('5.') || log.includes('6.') || log.includes('7.') || log.includes('8.') ? 'var(--accent-cyan)' : 'var(--text-secondary)', marginBottom: 4 }}>
                &gt; {log}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Experiment Comparison Charts */}
      {experiments.length > 0 && (
        <div className="card" style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 14 }}>
            Historical Experiment Trajectory (Accuracy & Macro F1)
          </h3>
          <PlotlyChart
            data={expChartData}
            layout={{
              yaxis: { title: 'Percentage (%)', range: [0, 100] },
              margin: { t: 20, r: 20, b: 40, l: 45 }
            }}
            style={{ height: 260 }}
          />
        </div>
      )}

      {/* Experiment Run History Table */}
      <div className="card" style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 14 }}>
          Completed Training Experiments ({experiments.length})
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Experiment ID</th>
                <th>Timestamp</th>
                <th>Model</th>
                <th>Epochs</th>
                <th>Best Epoch</th>
                <th>Test Accuracy</th>
                <th>Macro F1</th>
                <th>Weighted F1</th>
                <th>Execution Time</th>
              </tr>
            </thead>
            <tbody>
              {experiments.map((exp, idx) => (
                <tr key={idx}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                    {exp.experiment_id}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {exp.timestamp}
                  </td>
                  <td>{exp.model}</td>
                  <td>{exp.epochs}</td>
                  <td>Epoch #{exp.best_epoch}</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {exp.test_accuracy}%
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--accent-violet)' }}>
                    {exp.macro_f1}%
                  </td>
                  <td>{exp.weighted_f1}%</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>
                    {exp.total_pipeline_time_seconds ? `${exp.total_pipeline_time_seconds}s` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {experiments.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              No previous experiments recorded yet. Click "Run Complete Pipeline" or train a model in Training Studio.
            </div>
          )}
        </div>
      </div>

      {/* Local Model Registry */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HardDrive size={18} color="var(--accent-violet)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
              Local Model Registry & Checkpoints
            </h3>
          </div>
          <span className="badge badge-purple" style={{ fontSize: '0.72rem' }}>
            {models.length} Registered Checkpoints
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {models.map((m, idx) => (
            <div
              key={idx}
              style={{
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.025)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{m.name}</h4>
                  <span className={`badge ${m.status.includes('Active') ? 'badge-cyan' : 'badge-green'}`} style={{ fontSize: '0.68rem' }}>
                    {m.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                  Type: {m.type}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  Size: {m.size_kb > 1024 ? `${(m.size_kb / 1024).toFixed(1)} MB` : `${m.size_kb} KB`}
                </span>
                <span style={{ color: 'var(--accent-cyan)', fontSize: '0.78rem' }}>
                  {m.id}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
