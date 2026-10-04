import React, { useState, useEffect } from 'react';
import { Database, Clock, Users, Mic2, Activity, Play, RefreshCw } from 'lucide-react';
import KpiCard from '../components/KpiCard';
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

export default function DatasetLab({ summary, onRescan }) {
  const [samples, setSamples] = useState([]);
  const [selectedEmotion, setSelectedEmotion] = useState('All');
  const [loadingSamples, setLoadingSamples] = useState(false);

  useEffect(() => {
    loadSamples(selectedEmotion);
  }, [selectedEmotion]);

  const loadSamples = async (emo) => {
    setLoadingSamples(true);
    try {
      const res = await api.getSampleAudio(20, emo === 'All' ? null : emo);
      setSamples(res.samples || []);
    } catch (e) {
      console.error('Failed to load sample audios:', e);
    } finally {
      setLoadingSamples(false);
    }
  };

  const d = summary?.duration_stats || {};
  const emoCounts = summary?.emotion_counts || {};
  const actorCounts = summary?.actor_counts || {};
  const srCounts = summary?.sample_rate_distribution || {};
  const sentenceCounts = summary?.sentence_distribution || {};
  const durationByEmo = summary?.duration_by_emotion || {};

  // Emotion Distribution Bar Chart
  const emotionChartData = [{
    x: Object.keys(emoCounts),
    y: Object.values(emoCounts),
    type: 'bar',
    marker: {
      color: Object.keys(emoCounts).map(e => EMOTION_COLORS[e] || '#06b6d4'),
      line: { color: 'rgba(255, 255, 255, 0.2)', width: 1.5 }
    },
    text: Object.values(emoCounts),
    textposition: 'auto',
    hoverinfo: 'x+y'
  }];

  // Actor Distribution Bar Chart
  const actorKeys = Object.keys(actorCounts).slice(0, 25);
  const actorValues = Object.values(actorCounts).slice(0, 25);
  const actorChartData = [{
    x: actorKeys,
    y: actorValues,
    type: 'bar',
    marker: { color: '#8b5cf6' },
    hoverinfo: 'x+y'
  }];

  // Sample Rate Pie
  const srChartData = [{
    labels: Object.keys(srCounts).map(k => `${k} Hz`),
    values: Object.values(srCounts),
    type: 'pie',
    hole: 0.55,
    marker: {
      colors: ['#06b6d4', '#8b5cf6', '#10b981']
    },
    textinfo: 'label+percent',
    insidetextorientation: 'radial'
  }];

  // Duration by Emotion Chart
  const durByEmoData = [{
    x: Object.keys(durationByEmo),
    y: Object.keys(durationByEmo).map(k => durationByEmo[k].mean),
    type: 'bar',
    marker: {
      color: Object.keys(durationByEmo).map(e => EMOTION_COLORS[e] || '#3b82f6')
    },
    error_y: {
      type: 'data',
      array: Object.keys(durationByEmo).map(k => durationByEmo[k].std),
      visible: true,
      color: '#ffffff'
    },
    text: Object.keys(durationByEmo).map(k => `${durationByEmo[k].mean}s`),
    textposition: 'outside'
  }];

  return (
    <div>
      {/* Top Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800 }}>
            Dataset Lab & Exploratory Analytics
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: 4 }}>
            Ground-truth inspection of CREMA-D English emotional speech dataset across 91 actors and 6 primary emotion categories.
          </p>
        </div>

        <button 
          className="btn btn-secondary"
          onClick={onRescan}
        >
          <RefreshCw size={16} />
          <span>Rescan Dataset</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KpiCard
          title="Total Audio Files"
          value={summary?.total_files?.toLocaleString() || '7,442'}
          subtext={`${summary?.valid_files?.toLocaleString() || '7,442'} valid | ${summary?.corrupted_files || 0} corrupted`}
          icon={Database}
          color="var(--accent-cyan)"
        />

        <KpiCard
          title="Total Duration"
          value={`${d.total_hours || '10.5'} hrs`}
          subtext={`Avg Duration: ${d.mean || '2.54'}s (±${d.std || '0.51'}s)`}
          icon={Clock}
          color="var(--accent-violet)"
        />

        <KpiCard
          title="Speakers / Actors"
          value={summary?.num_speakers || 91}
          subtext="Balanced Male & Female Actors"
          icon={Users}
          color="var(--accent-emerald)"
        />

        <KpiCard
          title="Emotion Classes"
          value={summary?.num_emotions || 6}
          subtext="ANG, DIS, FEA, HAP, NEU, SAD"
          icon={Activity}
          color="var(--accent-amber)"
        />

        <KpiCard
          title="Sample Rate"
          value="16,000 Hz"
          subtext="Native 16-bit Mono PCM"
          icon={Mic2}
          color="var(--accent-blue)"
        />
      </div>

      {/* Interactive Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 24, marginBottom: 28 }}>
        {/* Chart 1: Emotion Distribution */}
        <div className="glass-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span>Emotion Class Distribution</span>
            </div>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Total: {summary?.valid_files || 7442} files
            </span>
          </div>
          <PlotlyChart
            data={emotionChartData}
            layout={{
              title: '',
              xaxis: { title: 'Emotion' },
              yaxis: { title: 'Number of Recordings' }
            }}
          />
        </div>

        {/* Chart 2: Average Duration by Emotion */}
        <div className="glass-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span>Speech Duration by Emotion (Seconds)</span>
            </div>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Mean ± 1 Std Dev
            </span>
          </div>
          <PlotlyChart
            data={durByEmoData}
            layout={{
              title: '',
              xaxis: { title: 'Emotion' },
              yaxis: { title: 'Mean Duration (s)', range: [0, 4] }
            }}
          />
        </div>

        {/* Chart 3: Actor Distribution (Top 25 Actors) */}
        <div className="glass-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span>Recordings Per Speaker (Actor IDs)</span>
            </div>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              ~81 clips per actor
            </span>
          </div>
          <PlotlyChart
            data={actorChartData}
            layout={{
              title: '',
              xaxis: { title: 'Actor ID' },
              yaxis: { title: 'Recordings Count' }
            }}
          />
        </div>

        {/* Chart 4: Sample Rate & Format */}
        <div className="glass-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span>Audio Sample Rate Distribution</span>
            </div>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Native Calibrated Specs
            </span>
          </div>
          <PlotlyChart
            data={srChartData}
            layout={{
              title: '',
              showlegend: true
            }}
          />
        </div>
      </div>

      {/* Interactive Audio Sample Explorer */}
      <div className="glass-panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">
              <span>Dataset Audio Explorer</span>
            </div>
            <p className="panel-desc">
              Listen to actual CREMA-D recordings, inspect true emotion labels, spoken sentences, and actor IDs.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Filter Emotion:</span>
            <select
              className="form-select"
              style={{ width: 140, padding: '6px 10px', fontSize: '0.82rem' }}
              value={selectedEmotion}
              onChange={(e) => setSelectedEmotion(e.target.value)}
            >
              <option value="All">All Emotions</option>
              <option value="Angry">Angry</option>
              <option value="Disgust">Disgust</option>
              <option value="Fear">Fear</option>
              <option value="Happy">Happy</option>
              <option value="Neutral">Neutral</option>
              <option value="Sad">Sad</option>
            </select>
          </div>
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Audio Playback</th>
                <th>File Name</th>
                <th>Emotion</th>
                <th>Spoken Sentence</th>
                <th>Actor ID</th>
                <th>Duration</th>
                <th>Split</th>
              </tr>
            </thead>
            <tbody>
              {samples.map((s, idx) => (
                <tr key={idx}>
                  <td style={{ width: 280 }}>
                    <AudioPlayer
                      fileName={s.file_name}
                      title={s.file_name}
                      duration={s.duration}
                    />
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{s.file_name}</td>
                  <td><EmotionBadge emotion={s.emotion} /></td>
                  <td style={{ color: '#cbd5e1' }}>"{s.sentence_text || s.sentence_id}"</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>#{s.actor_id}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{s.duration}s</td>
                  <td>
                    <span style={{
                      fontSize: '0.72rem',
                      padding: '2px 8px',
                      borderRadius: 10,
                      background: s.split === 'train' ? 'rgba(6, 182, 212, 0.12)' : (s.split === 'val' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(139, 92, 246, 0.12)'),
                      color: s.split === 'train' ? 'var(--accent-cyan)' : (s.split === 'val' ? 'var(--accent-amber)' : 'var(--accent-violet)'),
                      textTransform: 'uppercase',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {s.split || 'train'}
                    </span>
                  </td>
                </tr>
              ))}
              {samples.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    {loadingSamples ? 'Loading audio samples...' : 'No samples found.'}
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
