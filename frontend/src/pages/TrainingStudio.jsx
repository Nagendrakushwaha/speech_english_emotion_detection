import React, { useState, useEffect } from 'react';
import { Play, Square, Activity, Cpu, Clock, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import KpiCard from '../components/KpiCard';
import PlotlyChart from '../components/PlotlyChart';
import { api } from '../services/api';

export default function TrainingStudio() {
  const [params, setParams] = useState({
    epochs: 25,
    batch_size: 32,
    learning_rate: 0.001,
    optimizer: 'adam',
    weight_decay: 0.0001,
    dropout: 0.25,
    patience: 7,
    random_seed: 42,
    max_samples: 1200
  });

  const [status, setStatus] = useState({
    status: 'idle',
    epoch: 0,
    total_epochs: 25,
    train_loss: 0,
    val_loss: 0,
    train_accuracy: 0,
    val_accuracy: 0,
    learning_rate: 0.001,
    best_epoch: 0,
    best_val_loss: 0,
    elapsed_seconds: 0,
    remaining_seconds: 0,
    message: 'Ready to train'
  });

  const [history, setHistory] = useState({
    epochs: [],
    train_loss: [],
    val_loss: [],
    train_acc: [],
    val_acc: [],
    learning_rates: [],
    epoch_times: []
  });

  const [loading, setLoading] = useState(false);

  // Poll status while training
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const st = await api.getTrainingStatus();
      if (st) setStatus(st);
      const hist = await api.getTrainingHistory();
      if (hist && hist.epochs && hist.epochs.length > 0) {
        setHistory(hist);
      }
    } catch (e) {
      console.error('Error fetching training status:', e);
    }
  };

  const handleStartTraining = async () => {
    setLoading(true);
    try {
      await api.startTraining(params);
      fetchStatus();
    } catch (e) {
      alert(`Failed to start training: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStopTraining = async () => {
    try {
      await api.stopTraining();
      fetchStatus();
    } catch (e) {
      alert(`Failed to stop training: ${e.message}`);
    }
  };

  const isRunning = status.status === 'running';

  // Plotly Loss Chart
  const lossChartData = [
    {
      x: history.epochs || [],
      y: history.train_loss || [],
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Training Loss',
      line: { color: '#06b6d4', width: 2.5 }
    },
    {
      x: history.epochs || [],
      y: history.val_loss || [],
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Validation Loss',
      line: { color: '#f59e0b', width: 2.5, dash: 'dot' }
    }
  ];

  // Plotly Accuracy Chart
  const accChartData = [
    {
      x: history.epochs || [],
      y: (history.train_acc || []).map(a => +(a * 100).toFixed(1)),
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Train Accuracy (%)',
      line: { color: '#10b981', width: 2.5 }
    },
    {
      x: history.epochs || [],
      y: (history.val_acc || []).map(a => +(a * 100).toFixed(1)),
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Val Accuracy (%)',
      line: { color: '#8b5cf6', width: 2.5 }
    }
  ];

  // Plotly Learning Rate Chart
  const lrChartData = [
    {
      x: history.epochs || [],
      y: history.learning_rates || [],
      type: 'scatter',
      mode: 'lines',
      name: 'Learning Rate',
      line: { color: '#38bdf8', width: 2 }
    }
  ];

  // Plotly Time Per Epoch
  const timeChartData = [
    {
      x: history.epochs || [],
      y: history.epoch_times || [],
      type: 'bar',
      name: 'Seconds / Epoch',
      marker: { color: '#6366f1' }
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800 }}>
          Neural Training Studio & Live Telemetry
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: 4 }}>
          Train our lightweight PyTorch 2D-CNN on Log-Mel Spectrograms with Early Stopping, AdamW optimization, and real-time loss tracking.
        </p>
      </div>

      {/* Safety Alert */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 18px',
        background: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 24,
        fontSize: '0.84rem',
        color: '#fbbf24'
      }}>
        <AlertTriangle size={18} style={{ flexShrink: 0 }} />
        <span>
          <strong>CPU Safety Notice:</strong> CPU execution enabled for AMD Ryzen 5 / x86_64 architecture. Maximum epochs strictly limited to 100. Early stopping terminates once validation loss plateaus.
        </span>
      </div>

      {/* Training Control & Hyperparameter Form */}
      <div className="glass-panel" style={{ marginBottom: 28 }}>
        <div className="panel-header">
          <div className="panel-title">
            <Cpu size={18} color="var(--accent-cyan)" />
            <span>Hyperparameter Configuration</span>
          </div>
          <span className="status-pill">
            <span className={`status-dot ${isRunning ? 'pulse' : ''}`} style={{ background: isRunning ? '#10b981' : '#64748b' }} />
            {isRunning ? 'Training In Progress' : (status.status === 'completed' ? 'Model Ready' : 'Idle')}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
          <div className="form-group">
            <label className="form-label">Epochs (1–100)</label>
            <input
              type="number"
              min="1"
              max="100"
              className="form-input"
              value={params.epochs}
              onChange={(e) => setParams({ ...params, epochs: Math.min(100, Math.max(1, parseInt(e.target.value) || 1)) })}
              disabled={isRunning}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Batch Size (CPU)</label>
            <select
              className="form-select"
              value={params.batch_size}
              onChange={(e) => setParams({ ...params, batch_size: parseInt(e.target.value) })}
              disabled={isRunning}
            >
              <option value="16">16 (Low Memory)</option>
              <option value="32">32 (Recommended)</option>
              <option value="64">64 (Fast CPU)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Learning Rate</label>
            <input
              type="number"
              step="0.0001"
              min="0.00001"
              max="0.05"
              className="form-input"
              value={params.learning_rate}
              onChange={(e) => setParams({ ...params, learning_rate: parseFloat(e.target.value) || 0.001 })}
              disabled={isRunning}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Optimizer</label>
            <select
              className="form-select"
              value={params.optimizer}
              onChange={(e) => setParams({ ...params, optimizer: e.target.value })}
              disabled={isRunning}
            >
              <option value="adam">Adam</option>
              <option value="adamw">AdamW (Decoupled Weight Decay)</option>
              <option value="sgd">SGD with Momentum</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Early Stopping Patience</label>
            <input
              type="number"
              min="2"
              max="20"
              className="form-input"
              value={params.patience}
              onChange={(e) => setParams({ ...params, patience: parseInt(e.target.value) || 7 })}
              disabled={isRunning}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Sample Limit (Speedup)</label>
            <select
              className="form-select"
              value={params.max_samples || 'all'}
              onChange={(e) => setParams({ ...params, max_samples: e.target.value === 'all' ? null : parseInt(e.target.value) })}
              disabled={isRunning}
            >
              <option value="600">600 clips (Fast Iteration ~15s)</option>
              <option value="1200">1,200 clips (Balanced ~30s)</option>
              <option value="all">Full Dataset (7,442 clips)</option>
            </select>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {!isRunning ? (
            <button
              className="btn btn-primary"
              onClick={handleStartTraining}
              disabled={loading}
            >
              <Play size={16} />
              <span>{loading ? 'Starting...' : 'Start Model Training'}</span>
            </button>
          ) : (
            <button
              className="btn btn-danger"
              onClick={handleStopTraining}
            >
              <Square size={16} />
              <span>Stop Training Gracefully</span>
            </button>
          )}

          <div style={{ fontSize: '0.84rem', color: isRunning ? 'var(--text-cyan)' : 'var(--text-muted)' }}>
            {status.message || 'Configure hyperparameters and begin training.'}
          </div>
        </div>

        {/* Live Progress Bar */}
        {isRunning && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
              <span>Progress: Epoch {status.epoch} of {status.total_epochs}</span>
              <span>{Math.round((status.epoch / Math.max(1, status.total_epochs)) * 100)}%</span>
            </div>
            <div className="progress-bar-container">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${Math.min(100, Math.round((status.epoch / Math.max(1, status.total_epochs)) * 100))}%` }} 
              />
            </div>
          </div>
        )}
      </div>

      {/* Live Telemetry KPI Cards */}
      <div className="kpi-grid">
        <KpiCard
          title="Current Epoch"
          value={status.epoch ? `${status.epoch} / ${status.total_epochs}` : '0'}
          subtext={`Best Epoch: #${status.best_epoch || '—'}`}
          icon={Activity}
          color="var(--accent-cyan)"
        />

        <KpiCard
          title="Training Loss"
          value={status.train_loss !== undefined && status.train_loss !== 0 ? status.train_loss.toFixed(4) : '—'}
          subtext={`Val Loss: ${status.val_loss ? status.val_loss.toFixed(4) : '—'}`}
          icon={Cpu}
          color="var(--accent-rose)"
        />

        <KpiCard
          title="Validation Accuracy"
          value={status.val_accuracy !== undefined && status.val_accuracy !== 0 ? `${status.val_accuracy}%` : '—'}
          subtext={`Train Accuracy: ${status.train_accuracy ? `${status.train_accuracy}%` : '—'}`}
          icon={CheckCircle2}
          color="var(--accent-emerald)"
        />

        <KpiCard
          title="Elapsed Training Time"
          value={`${status.elapsed_seconds || 0}s`}
          subtext={`Est. Remaining: ${status.remaining_seconds ? `${status.remaining_seconds}s` : '0s'}`}
          icon={Clock}
          color="var(--accent-amber)"
        />
      </div>

      {/* Plotly Live Curves */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 24 }}>
        {/* Loss Curve */}
        <div className="glass-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span>Training vs Validation Loss</span>
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Cross-Entropy Loss
            </span>
          </div>
          {history.epochs && history.epochs.length > 0 ? (
            <PlotlyChart
              data={lossChartData}
              layout={{
                xaxis: { title: 'Epoch' },
                yaxis: { title: 'Loss' }
              }}
            />
          ) : (
            <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Loss curve will appear after Epoch 1.
            </div>
          )}
        </div>

        {/* Accuracy Curve */}
        <div className="glass-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span>Training vs Validation Accuracy (%)</span>
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Top-1 Classification
            </span>
          </div>
          {history.epochs && history.epochs.length > 0 ? (
            <PlotlyChart
              data={accChartData}
              layout={{
                xaxis: { title: 'Epoch' },
                yaxis: { title: 'Accuracy (%)', range: [0, 100] }
              }}
            />
          ) : (
            <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Accuracy curve will appear after Epoch 1.
            </div>
          )}
        </div>

        {/* Learning Rate Curve */}
        <div className="glass-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span>Learning Rate Schedule (ReduceLROnPlateau)</span>
            </div>
          </div>
          {history.epochs && history.epochs.length > 0 ? (
            <PlotlyChart
              data={lrChartData}
              layout={{
                xaxis: { title: 'Epoch' },
                yaxis: { title: 'Learning Rate' }
              }}
            />
          ) : (
            <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Schedule will appear during training.
            </div>
          )}
        </div>

        {/* Time Per Epoch Bar Chart */}
        <div className="glass-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span>Seconds Per Epoch (CPU Compute)</span>
            </div>
          </div>
          {history.epochs && history.epochs.length > 0 ? (
            <PlotlyChart
              data={timeChartData}
              layout={{
                xaxis: { title: 'Epoch' },
                yaxis: { title: 'Duration (Seconds)' }
              }}
            />
          ) : (
            <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Timing data will appear during training.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
