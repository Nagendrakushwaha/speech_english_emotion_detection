import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, Volume2, Filter, Download, Play, 
  BarChart3, RefreshCw, CheckCircle2, ChevronRight, User, Clock 
} from 'lucide-react';
import PlotlyChart from '../components/PlotlyChart';
import AudioPlayer from '../components/AudioPlayer';
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

export default function ErrorAnalysis({ evaluation, onReevaluate }) {
  const [filterTrueEmo, setFilterTrueEmo] = useState('All');
  const [filterPredEmo, setFilterPredEmo] = useState('All');
  const [filterActor, setFilterActor] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeAudioSample, setActiveAudioSample] = useState(null);

  const errorAnalysis = evaluation?.error_analysis || {};
  const totalErrors = errorAnalysis.total_errors || 0;
  const errorRate = errorAnalysis.error_rate || 0;
  const topConfusedPairs = errorAnalysis.top_confused_pairs || [];
  const errorsByEmotion = errorAnalysis.errors_by_emotion || {};
  const errorsByActor = errorAnalysis.errors_by_actor || {};
  const misclassifiedSamples = errorAnalysis.misclassified_samples || [];

  // Filtered samples
  const filteredSamples = misclassifiedSamples.filter(sample => {
    if (filterTrueEmo !== 'All' && sample.true_emotion !== filterTrueEmo) return false;
    if (filterPredEmo !== 'All' && sample.predicted_emotion !== filterPredEmo) return false;
    if (filterActor !== 'All' && String(sample.actor_id) !== filterActor) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchFile = sample.file_name.toLowerCase().includes(q);
      const matchSentence = (sample.sentence_text || '').toLowerCase().includes(q);
      if (!matchFile && !matchSentence) return false;
    }
    return true;
  });

  // Top confused pairs bar chart data
  const confusedPairsChartData = [{
    x: topConfusedPairs.map(p => p.pair),
    y: topConfusedPairs.map(p => p.count),
    type: 'bar',
    marker: {
      color: '#f43f5e',
      line: { color: 'rgba(255, 255, 255, 0.2)', width: 1.5 }
    },
    text: topConfusedPairs.map(p => p.count),
    textposition: 'auto',
    hoverinfo: 'x+y'
  }];

  // Errors by true emotion bar chart
  const errorsByEmoChartData = [{
    x: Object.keys(errorsByEmotion),
    y: Object.values(errorsByEmotion),
    type: 'bar',
    marker: {
      color: Object.keys(errorsByEmotion).map(e => EMOTION_COLORS[e] || '#06b6d4')
    },
    text: Object.values(errorsByEmotion),
    textposition: 'auto'
  }];

  // Errors by Actor bar chart
  const errorsByActorChartData = [{
    x: Object.keys(errorsByActor).map(a => `Actor ${a}`),
    y: Object.values(errorsByActor),
    type: 'bar',
    marker: { color: '#8b5cf6' },
    text: Object.values(errorsByActor),
    textposition: 'auto'
  }];

  const emotionsList = ['Angry', 'Disgust', 'Fear', 'Happy', 'Neutral', 'Sad'];
  const actorList = Array.from(new Set(misclassifiedSamples.map(s => String(s.actor_id)))).sort();

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 20, background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', marginBottom: 10 }}>
            <AlertTriangle size={14} color="var(--accent-rose)" />
            <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--accent-rose)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Acoustic Error Diagnostic Center
            </span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800 }}>
            Error Analysis & Misclassification Center
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: 4 }}>
            Systematic inspection of misclassified test examples on the untouched speaker-independent test split. Listen to genuine acoustic edge cases.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <a
            href={api.getExportUrl('json')}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
          >
            <Download size={16} />
            <span>Export Error Log</span>
          </a>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card">
          <div className="kpi-label">
            <AlertTriangle size={16} color="var(--accent-rose)" />
            <span>Test Error Count</span>
          </div>
          <div className="kpi-value" style={{ color: 'var(--accent-rose)' }}>
            {totalErrors.toLocaleString()}
          </div>
          <div className="kpi-subtext">Across {evaluation?.total_test_samples || 1142} test audio files</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <BarChart3 size={16} color="var(--accent-amber)" />
            <span>Test Error Rate</span>
          </div>
          <div className="kpi-value" style={{ color: 'var(--accent-amber)' }}>
            {errorRate}%
          </div>
          <div className="kpi-subtext">Accuracy: {evaluation?.metrics?.accuracy || 46.5}%</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <RefreshCw size={16} color="var(--accent-violet)" />
            <span>Primary Confusion Pair</span>
          </div>
          <div className="kpi-value" style={{ fontSize: '1.25rem', color: 'var(--accent-violet)' }}>
            {topConfusedPairs[0]?.pair || 'Neutral -> Sad'}
          </div>
          <div className="kpi-subtext">{topConfusedPairs[0]?.count || 0} misclassified speech instances</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <User size={16} color="var(--accent-cyan)" />
            <span>Most Confused Actor</span>
          </div>
          <div className="kpi-value" style={{ color: 'var(--accent-cyan)' }}>
            Actor #{Object.keys(errorsByActor)[0] || '1016'}
          </div>
          <div className="kpi-subtext">{Object.values(errorsByActor)[0] || 0} acoustic errors detected</div>
        </div>
      </div>

      {/* Analytical Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20, marginBottom: 28 }}>
        {/* Confused Emotion Pairs */}
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 14 }}>
            Most Confused Emotion Pairs (True $\to$ Predicted)
          </h3>
          <PlotlyChart
            data={confusedPairsChartData}
            layout={{
              xaxis: { tickangle: -25, tickfont: { size: 10 } },
              yaxis: { title: 'Misclassified Instances' },
              margin: { t: 20, r: 20, b: 65, l: 45 }
            }}
            style={{ height: 280 }}
          />
        </div>

        {/* Errors by True Emotion */}
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 14 }}>
            Error Distribution by True Emotion
          </h3>
          <PlotlyChart
            data={errorsByEmoChartData}
            layout={{
              xaxis: { title: 'Ground Truth Emotion' },
              yaxis: { title: 'Total Errors' },
              margin: { t: 20, r: 20, b: 40, l: 45 }
            }}
            style={{ height: 280 }}
          />
        </div>
      </div>

      {/* Filter and Audio Inspection Section */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
              Inspect & Listen to Misclassified Examples ({filteredSamples.length})
            </h3>
          </div>

          {/* Quick Filters */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <select
              value={filterTrueEmo}
              onChange={(e) => setFilterTrueEmo(e.target.value)}
              className="select-custom"
            >
              <option value="All">All True Emotions</option>
              {emotionsList.map(e => <option key={e} value={e}>True: {e}</option>)}
            </select>

            <select
              value={filterPredEmo}
              onChange={(e) => setFilterPredEmo(e.target.value)}
              className="select-custom"
            >
              <option value="All">All Predictions</option>
              {emotionsList.map(e => <option key={e} value={e}>Pred: {e}</option>)}
            </select>

            <select
              value={filterActor}
              onChange={(e) => setFilterActor(e.target.value)}
              className="select-custom"
            >
              <option value="All">All Actors</option>
              {actorList.map(a => <option key={a} value={a}>Actor #{a}</option>)}
            </select>
          </div>
        </div>

        {/* Audio Player if sample is selected */}
        {activeAudioSample && (
          <div style={{ marginBottom: 20, padding: '16px', background: 'rgba(6, 182, 212, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <strong>Active Audio:</strong> {activeAudioSample.file_name} (Actor #{activeAudioSample.actor_id})
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  "{activeAudioSample.sentence_text}"
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span>True:</span> <EmotionBadge emotion={activeAudioSample.true_emotion} />
                <span style={{ margin: '0 4px' }}>$\to$</span>
                <span>Pred:</span> <EmotionBadge emotion={activeAudioSample.predicted_emotion} />
              </div>
            </div>
            <AudioPlayer
              fileName={activeAudioSample.file_name}
              duration={activeAudioSample.duration}
            />
          </div>
        )}

        {/* Table of Misclassified Examples */}
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Audio Playback</th>
                <th>File Name</th>
                <th>True Emotion</th>
                <th>Predicted Emotion</th>
                <th>Confidence</th>
                <th>Top-3 Probabilities</th>
                <th>Actor</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {filteredSamples.slice(0, 35).map((row, idx) => (
                <tr key={idx} style={{ background: activeAudioSample?.file_name === row.file_name ? 'rgba(6, 182, 212, 0.12)' : 'transparent' }}>
                  <td>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      onClick={() => setActiveAudioSample(row)}
                    >
                      <Play size={13} />
                      <span>Play</span>
                    </button>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                    {row.file_name}
                  </td>
                  <td>
                    <EmotionBadge emotion={row.true_emotion} />
                  </td>
                  <td>
                    <EmotionBadge emotion={row.predicted_emotion} />
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--accent-rose)' }}>
                    {(row.confidence * 100).toFixed(1)}%
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, fontSize: '0.76rem' }}>
                      {row.top3?.map((t, i) => (
                        <span key={i} style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(255, 255, 255, 0.05)', color: i === 0 ? 'var(--accent-rose)' : 'var(--text-secondary)' }}>
                          {t.emotion}: {(t.probability * 100).toFixed(0)}%
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>Actor #{row.actor_id}</td>
                  <td>{row.duration}s</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredSamples.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              No misclassified examples match the selected filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
