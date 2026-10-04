import React, { useState } from 'react';
import { BarChart3, Activity, Download, RefreshCw, CheckCircle2, TrendingUp, ShieldCheck } from 'lucide-react';
import KpiCard from '../components/KpiCard';
import PlotlyChart from '../components/PlotlyChart';
import EmotionBadge from '../components/EmotionBadge';
import { api } from '../services/api';

const EMOTION_COLORS = {
  Angry: '#ef4444',
  Disgust: '#a855f7',
  Fear: '#f59e0b',
  Happy: '#10b981',
  Neutral: '#64748b',
  Sad: '#3b82f6'
};

export default function EvaluationCenter({ evaluation, onReevaluate }) {
  const [cmMode, setCmMode] = useState('counts'); // 'counts' or 'normalized'
  const [activeCurveTab, setActiveCurveTab] = useState('roc'); // 'roc' or 'pr'
  const [evaluating, setEvaluating] = useState(false);

  const handleRunEval = async () => {
    setEvaluating(true);
    try {
      await onReevaluate();
    } catch (e) {
      alert(`Evaluation error: ${e.message}`);
    } finally {
      setEvaluating(false);
    }
  };

  const m = evaluation?.metrics || {};
  const perClass = evaluation?.per_class || [];
  const cm = evaluation?.confusion_matrix || {};
  const rocCurves = evaluation?.roc_curves || {};
  const prCurves = evaluation?.pr_curves || {};

  // Confusion Matrix Heatmap Data
  const cmMatrix = cmMode === 'counts' ? cm.counts : cm.normalized;
  const cmLabels = cm.classes || ['Angry', 'Disgust', 'Fear', 'Happy', 'Neutral', 'Sad'];
  
  const cmChartData = [{
    z: cmMatrix || [[0]],
    x: cmLabels,
    y: cmLabels,
    type: 'heatmap',
    colorscale: 'Blues',
    reversescale: false,
    text: cmMatrix ? cmMatrix.map(row => row.map(v => cmMode === 'counts' ? `${v}` : `${(v * 100).toFixed(1)}%`)) : [],
    texttemplate: '%{text}',
    textfont: { color: '#ffffff', size: 12, family: 'Inter' },
    hoverinfo: 'x+y+z',
    colorbar: { title: cmMode === 'counts' ? 'Sample Count' : 'Rate' }
  }];

  // ROC Curves (One-vs-Rest)
  const rocTraces = Object.keys(rocCurves).map(emo => ({
    x: rocCurves[emo].fpr || [],
    y: rocCurves[emo].tpr || [],
    type: 'scatter',
    mode: 'lines',
    name: `${emo} (AUC = ${rocCurves[emo].auc})`,
    line: { color: EMOTION_COLORS[emo] || '#06b6d4', width: 2 }
  }));
  // Diagonal reference line
  rocTraces.push({
    x: [0, 1],
    y: [0, 1],
    type: 'scatter',
    mode: 'lines',
    name: 'Chance (AUC = 0.50)',
    line: { color: 'rgba(255, 255, 255, 0.25)', dash: 'dash', width: 1.5 }
  });

  // Precision-Recall Curves
  const prTraces = Object.keys(prCurves).map(emo => ({
    x: prCurves[emo].recall || [],
    y: prCurves[emo].precision || [],
    type: 'scatter',
    mode: 'lines',
    name: `${emo} (AP = ${prCurves[emo].ap})`,
    line: { color: EMOTION_COLORS[emo] || '#06b6d4', width: 2 }
  }));

  const handleDownloadReport = (format) => {
    window.open(api.getExportUrl(format), '_blank');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800 }}>
            Model Evaluation & Performance Benchmarks
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: 4 }}>
            Rigorous evaluation on the untouched speaker-independent test split. Zero speaker leakage guaranteed.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={() => handleDownloadReport('json')}
          >
            <Download size={15} />
            <span>Export JSON</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => handleDownloadReport('txt')}
          >
            <Download size={15} />
            <span>Export Report (TXT)</span>
          </button>

          <button
            className="btn btn-primary"
            onClick={handleRunEval}
            disabled={evaluating}
          >
            <RefreshCw size={15} className={evaluating ? 'spin' : ''} />
            <span>{evaluating ? 'Evaluating...' : 'Re-run Evaluation'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KpiCard
          title="Overall Test Accuracy"
          value={m.accuracy !== undefined ? `${m.accuracy}%` : '—'}
          subtext={`Correct: ${evaluation?.correct_samples || '—'} / ${evaluation?.total_test_samples || '—'} samples`}
          icon={CheckCircle2}
          color="var(--accent-emerald)"
        />

        <KpiCard
          title="Macro F1-Score"
          value={m.macro_f1 !== undefined ? `${m.macro_f1}%` : '—'}
          subtext="Unweighted Class Average"
          icon={Activity}
          color="var(--accent-cyan)"
        />

        <KpiCard
          title="Weighted F1-Score"
          value={m.weighted_f1 !== undefined ? `${m.weighted_f1}%` : '—'}
          subtext="Weighted by Class Support"
          icon={TrendingUp}
          color="var(--accent-violet)"
        />

        <KpiCard
          title="Balanced Accuracy"
          value={m.balanced_accuracy !== undefined ? `${m.balanced_accuracy}%` : '—'}
          subtext="Normalized Sensitivity"
          icon={ShieldCheck}
          color="var(--accent-amber)"
        />

        <KpiCard
          title="Multiclass Macro AUC"
          value={m.macro_auc !== undefined ? m.macro_auc : '—'}
          subtext="One-vs-Rest ROC Curve"
          icon={BarChart3}
          color="var(--accent-blue)"
        />
      </div>

      {/* Confusion Matrix and ROC/PR Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 24, marginBottom: 28 }}>
        {/* Confusion Matrix Panel */}
        <div className="glass-panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">
                <span>Confusion Matrix (Ground Truth vs Predicted)</span>
              </div>
              <p className="panel-desc">
                Evaluate false positives, false negatives, and confusion patterns across all 6 emotion classes.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={`btn btn-sm ${cmMode === 'counts' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setCmMode('counts')}
              >
                Counts
              </button>
              <button
                className={`btn btn-sm ${cmMode === 'normalized' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setCmMode('normalized')}
              >
                Percentages (%)
              </button>
            </div>
          </div>

          {cm.counts && cm.counts.length > 0 ? (
            <PlotlyChart
              data={cmChartData}
              layout={{
                xaxis: { title: 'Predicted Emotion' },
                yaxis: { title: 'True Ground-Truth Emotion', autorange: 'reversed' }
              }}
              style={{ height: '420px' }}
            />
          ) : (
            <div style={{ height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Run evaluation to view the Confusion Matrix.
            </div>
          )}
        </div>

        {/* ROC / PR Curves Panel */}
        <div className="glass-panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">
                <span>{activeCurveTab === 'roc' ? 'One-vs-Rest ROC Curves' : 'Precision-Recall Curves'}</span>
              </div>
              <p className="panel-desc">
                {activeCurveTab === 'roc' 
                  ? 'True Positive Rate vs False Positive Rate for each emotion class with Area Under Curve (AUC).' 
                  : 'Precision vs Recall across varying probability thresholds with Average Precision (AP).'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={`btn btn-sm ${activeCurveTab === 'roc' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveCurveTab('roc')}
              >
                ROC Curves
              </button>
              <button
                className={`btn btn-sm ${activeCurveTab === 'pr' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveCurveTab('pr')}
              >
                PR Curves
              </button>
            </div>
          </div>

          {rocTraces.length > 1 ? (
            <PlotlyChart
              data={activeCurveTab === 'roc' ? rocTraces : prTraces}
              layout={{
                xaxis: { title: activeCurveTab === 'roc' ? 'False Positive Rate (1 - Specificity)' : 'Recall', range: [0, 1] },
                yaxis: { title: activeCurveTab === 'roc' ? 'True Positive Rate (Sensitivity)' : 'Precision', range: [0, 1.05] },
                legend: { orientation: 'h', y: -0.2 }
              }}
              style={{ height: '420px' }}
            />
          ) : (
            <div style={{ height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Curves will generate once model evaluation executes.
            </div>
          )}
        </div>
      </div>

      {/* Per-Class Classification Report Table */}
      <div className="glass-panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">
              <span>Detailed Classification Report (Per Emotion Class)</span>
            </div>
            <p className="panel-desc">
              Standardized precision, recall, F1-score, and support metrics evaluated on the test split.
            </p>
          </div>
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Emotion</th>
                <th>Precision</th>
                <th>Recall</th>
                <th>F1-Score</th>
                <th>Support (Test Audio Clips)</th>
                <th>Performance Indicator</th>
              </tr>
            </thead>
            <tbody>
              {perClass.map((row, idx) => {
                const f1Pct = Math.round(row.f1 * 100);
                return (
                  <tr key={idx}>
                    <td><EmotionBadge emotion={row.emotion} /></td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{(row.precision * 100).toFixed(1)}%</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{(row.recall * 100).toFixed(1)}%</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: f1Pct >= 50 ? 'var(--accent-emerald)' : '#cbd5e1' }}>
                      {(row.f1 * 100).toFixed(1)}%
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{row.support}</td>
                    <td style={{ width: 180 }}>
                      <div className="progress-bar-container">
                        <div
                          className="progress-bar-fill"
                          style={{
                            width: `${Math.min(100, f1Pct)}%`,
                            background: EMOTION_COLORS[row.emotion] || 'var(--accent-cyan)'
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}

              {perClass.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No evaluation metrics available yet. Click "Re-run Evaluation" above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
