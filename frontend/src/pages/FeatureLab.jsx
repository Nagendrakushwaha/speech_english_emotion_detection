import React, { useState, useEffect } from 'react';
import { Layers, Sparkles, Sliders, BarChart2, RefreshCw } from 'lucide-react';
import PlotlyChart from '../components/PlotlyChart';
import { api } from '../services/api';

const EMOTION_COLORS = {
  Angry: '#ef4444',
  Disgust: '#a855f7',
  Fear: '#f59e0b',
  Happy: '#10b981',
  Neutral: '#64748b',
  Sad: '#3b82f6'
};

export default function FeatureLab() {
  const [activeTab, setActiveTab] = useState('3d_pca'); // 3d_pca, 3d_acoustic, distributions, mfcc_heatmap
  const [pcaData, setPcaData] = useState(null);
  const [acousticData, setAcousticData] = useState(null);
  const [distData, setDistData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedEmotionFilter, setSelectedEmotionFilter] = useState('All');

  useEffect(() => {
    loadAllFeatureData();
  }, []);

  const loadAllFeatureData = async () => {
    setLoading(true);
    try {
      const [pca, acoustic, dists] = await Promise.all([
        api.get3dPCA().catch(() => null),
        api.get3dAcoustic().catch(() => null),
        api.getFeatureDistributions().catch(() => null)
      ]);
      setPcaData(pca);
      setAcousticData(acoustic);
      setDistData(dists);
    } catch (e) {
      console.error('Failed to load feature lab data:', e);
    } finally {
      setLoading(false);
    }
  };

  // 1. 3D PCA Plotly Scatter Data
  const pcaPoints = pcaData?.pca_points || [];
  const filteredPca = selectedEmotionFilter === 'All'
    ? pcaPoints
    : pcaPoints.filter(p => p.emotion === selectedEmotionFilter);

  // Group by emotion for Plotly legend & color
  const emotionsList = ['Angry', 'Disgust', 'Fear', 'Happy', 'Neutral', 'Sad'];
  const pcaPlotlyTraces = emotionsList.map(emo => {
    const pts = filteredPca.filter(p => p.emotion === emo);
    return {
      x: pts.map(p => p.x),
      y: pts.map(p => p.y),
      z: pts.map(p => p.z),
      mode: 'markers',
      type: 'scatter3d',
      name: emo,
      text: pts.map(p => `${p.file_name} (Actor #${p.actor})`),
      marker: {
        size: 4,
        color: EMOTION_COLORS[emo] || '#06b6d4',
        opacity: 0.8
      }
    };
  }).filter(t => t.x.length > 0);

  // 2. 3D Acoustic Feature Space Traces
  const acousticPoints = acousticData?.acoustic_points || [];
  const filteredAcoustic = selectedEmotionFilter === 'All'
    ? acousticPoints
    : acousticPoints.filter(p => p.emotion === selectedEmotionFilter);

  const acousticPlotlyTraces = emotionsList.map(emo => {
    const pts = filteredAcoustic.filter(p => p.emotion === emo);
    return {
      x: pts.map(p => p.x),
      y: pts.map(p => p.y),
      z: pts.map(p => p.z),
      mode: 'markers',
      type: 'scatter3d',
      name: emo,
      text: pts.map(p => `${p.file_name} (Actor #${p.actor})`),
      marker: {
        size: 4,
        color: EMOTION_COLORS[emo] || '#3b82f6',
        opacity: 0.8
      }
    };
  }).filter(t => t.x.length > 0);

  // 3. Feature Distribution Boxplots (e.g. RMS, Spectral Centroid, ZCR)
  const groupedDist = distData?.grouped_distributions || {};
  const rmsData = groupedDist.rms_mean || {};
  const scData = groupedDist.spectral_centroid_mean || {};
  const zcrData = groupedDist.zcr_mean || {};

  const rmsBoxTraces = Object.keys(rmsData).map(emo => ({
    y: rmsData[emo].samples || [rmsData[emo].mean],
    type: 'box',
    name: emo,
    marker: { color: EMOTION_COLORS[emo] || '#06b6d4' },
    boxpoints: 'outliers'
  }));

  const scBoxTraces = Object.keys(scData).map(emo => ({
    y: scData[emo].samples || [scData[emo].mean],
    type: 'box',
    name: emo,
    marker: { color: EMOTION_COLORS[emo] || '#8b5cf6' },
    boxpoints: 'outliers'
  }));

  // 4. MFCC Heatmap across Emotions
  const mfccHeatmap = distData?.mfcc_heatmap || {};
  const mfccHeatmapTrace = [{
    z: Object.values(mfccHeatmap),
    x: Array.from({ length: 13 }, (_, i) => `MFCC ${i + 1}`),
    y: Object.keys(mfccHeatmap),
    type: 'heatmap',
    colorscale: 'Plasma',
    colorbar: { title: 'Mean Amplitude' }
  }];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800 }}>
            3D Feature Laboratory & Acoustic Manifolds
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: 4 }}>
            Dimensionality reduction, 3D PCA hyper-spaces, acoustic timbre separation, and feature variance decomposition.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            className="form-select"
            style={{ width: 150, padding: '8px 12px', fontSize: '0.82rem' }}
            value={selectedEmotionFilter}
            onChange={(e) => setSelectedEmotionFilter(e.target.value)}
          >
            <option value="All">All Emotions</option>
            <option value="Angry">Angry</option>
            <option value="Disgust">Disgust</option>
            <option value="Fear">Fear</option>
            <option value="Happy">Happy</option>
            <option value="Neutral">Neutral</option>
            <option value="Sad">Sad</option>
          </select>

          <button
            className="btn btn-secondary"
            onClick={loadAllFeatureData}
            title="Refresh feature data"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Navigation Mode Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {[
          { id: '3d_pca', label: '3D PCA Feature Space', icon: Sparkles },
          { id: '3d_acoustic', label: '3D Acoustic Coordinates (MFCC × Centroid × RMS)', icon: Layers },
          { id: 'distributions', label: 'Feature Distributions & Boxplots', icon: Sliders },
          { id: 'mfcc_heatmap', label: 'MFCC 1–13 Emotion Heatmap', icon: BarChart2 }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.84rem' }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-muted)' }}>
          <div className="status-dot pulse" style={{ width: 14, height: 14, margin: '0 auto 16px' }} />
          <span>Computing Principal Component Analysis across 46 acoustic dimensions...</span>
        </div>
      ) : (
        <>
          {/* TAB 1: 3D PCA Space */}
          {activeTab === '3d_pca' && (
            <div className="glass-panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title">
                    <span>3D Principal Component Analysis (PCA 1 × PCA 2 × PCA 3)</span>
                  </div>
                  <p className="panel-desc">
                    {pcaData?.feature_count || 46} acoustic dimensions reduced to 3 orthogonal principal axes. 
                    Variance explained: PCA1 ({pcaData?.explained_variance_ratio?.[0]}%), PCA2 ({pcaData?.explained_variance_ratio?.[1]}%), PCA3 ({pcaData?.explained_variance_ratio?.[2]}%). Total: {pcaData?.total_variance_explained}%.
                  </p>
                </div>
                <span className="status-pill">
                  <span className="status-dot" />
                  {filteredPca.length} Coordinates Plotted
                </span>
              </div>

              <PlotlyChart
                data={pcaPlotlyTraces}
                layout={{
                  scene: {
                    xaxis: { title: `PCA 1 (${pcaData?.explained_variance_ratio?.[0] || ''}%)` },
                    yaxis: { title: `PCA 2 (${pcaData?.explained_variance_ratio?.[1] || ''}%)` },
                    zaxis: { title: `PCA 3 (${pcaData?.explained_variance_ratio?.[2] || ''}%)` },
                    camera: { eye: { x: 1.4, y: 1.4, z: 1.1 } }
                  },
                  margin: { t: 10, r: 10, b: 10, l: 10 },
                  legend: { orientation: 'h', y: -0.1 }
                }}
                style={{ height: '540px' }}
              />
            </div>
          )}

          {/* TAB 2: 3D Acoustic Coordinates */}
          {activeTab === '3d_acoustic' && (
            <div className="glass-panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title">
                    <span>3D Acoustic Physical Feature Space</span>
                  </div>
                  <p className="panel-desc">
                    Direct acoustic observables: X = MFCC-1 Mean (spectral envelope), Y = Spectral Centroid Mean (frequency brightness), Z = RMS Energy Mean (loudness).
                  </p>
                </div>
                <span className="status-pill">
                  <span className="status-dot" />
                  {filteredAcoustic.length} Audio Clips
                </span>
              </div>

              <PlotlyChart
                data={acousticPlotlyTraces}
                layout={{
                  scene: {
                    xaxis: { title: 'MFCC-1 Mean' },
                    yaxis: { title: 'Spectral Centroid (Hz)' },
                    zaxis: { title: 'RMS Energy' },
                    camera: { eye: { x: 1.5, y: 1.5, z: 1.2 } }
                  },
                  margin: { t: 10, r: 10, b: 10, l: 10 },
                  legend: { orientation: 'h', y: -0.1 }
                }}
                style={{ height: '540px' }}
              />
            </div>
          )}

          {/* TAB 3: Feature Distributions */}
          {activeTab === 'distributions' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 24 }}>
              <div className="glass-panel">
                <div className="panel-header">
                  <div className="panel-title">
                    <span>RMS Energy Distribution by Emotion</span>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Loudness Profile
                  </span>
                </div>
                <PlotlyChart
                  data={rmsBoxTraces}
                  layout={{
                    xaxis: { title: 'Emotion' },
                    yaxis: { title: 'RMS Energy Mean' }
                  }}
                />
              </div>

              <div className="glass-panel">
                <div className="panel-header">
                  <div className="panel-title">
                    <span>Spectral Centroid Distribution by Emotion</span>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Acoustic Brightness (Hz)
                  </span>
                </div>
                <PlotlyChart
                  data={scBoxTraces}
                  layout={{
                    xaxis: { title: 'Emotion' },
                    yaxis: { title: 'Spectral Centroid (Hz)' }
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB 4: MFCC Heatmap across emotions */}
          {activeTab === 'mfcc_heatmap' && (
            <div className="glass-panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title">
                    <span>MFCC 1–13 Timbre Profile Heatmap by Emotion</span>
                  </div>
                  <p className="panel-desc">
                    Mean amplitude of Mel-frequency cepstral coefficients across each emotional state in CREMA-D.
                  </p>
                </div>
              </div>
              <PlotlyChart
                data={mfccHeatmapTrace}
                layout={{
                  xaxis: { title: 'Cepstral Coefficient' },
                  yaxis: { title: 'Emotion Category' }
                }}
                style={{ height: '420px' }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
