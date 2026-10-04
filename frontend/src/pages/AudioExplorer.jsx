import React, { useState, useEffect } from 'react';
import { Waveform, Layers, Disc, Activity, Sparkles, Volume2 } from 'lucide-react';
import PlotlyChart from '../components/PlotlyChart';
import AudioPlayer from '../components/AudioPlayer';
import EmotionBadge from '../components/EmotionBadge';
import { api } from '../services/api';

export default function AudioExplorer({ sampleAudios = [] }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeVizTab, setActiveVizTab] = useState('waveform'); // waveform, spectrogram, mfcc, 3d_surface

  useEffect(() => {
    if (sampleAudios.length > 0 && !selectedFile) {
      setSelectedFile(sampleAudios[0]);
    }
  }, [sampleAudios]);

  useEffect(() => {
    if (selectedFile) {
      loadAudioAnalysis(selectedFile);
    }
  }, [selectedFile]);

  const loadAudioAnalysis = async (fileObj) => {
    setLoading(true);
    try {
      // Fetch audio file as blob and analyze
      const audioUrl = api.getAudioUrl(fileObj.file_name);
      const res = await fetch(audioUrl);
      const blob = await res.blob();
      
      const formData = new FormData();
      formData.append('file', blob, fileObj.file_name);
      
      const analysis = await api.analyzeAudio(formData);
      setAnalysisData(analysis);
    } catch (e) {
      console.error('Failed to analyze audio:', e);
    } finally {
      setLoading(false);
    }
  };

  const viz = analysisData?.visualizations || {};
  const waveformSamples = viz.waveform || [];
  const specGrid = viz.spectrogram || [];
  const mfccGrid = viz.mfcc || [];

  // Waveform chart
  const waveformChartData = [{
    x: waveformSamples.map((_, i) => (i / waveformSamples.length * (analysisData?.duration_seconds || 2.5)).toFixed(3)),
    y: waveformSamples,
    type: 'scatter',
    mode: 'lines',
    line: { color: '#06b6d4', width: 1.5 },
    fill: 'tozeroy',
    fillcolor: 'rgba(6, 182, 212, 0.15)'
  }];

  // Spectrogram Heatmap
  const spectrogramChartData = [{
    z: specGrid,
    type: 'heatmap',
    colorscale: 'Viridis',
    colorbar: { title: 'dB (Power)' }
  }];

  // MFCC Heatmap
  const mfccChartData = [{
    z: mfccGrid,
    type: 'heatmap',
    colorscale: 'Plasma',
    colorbar: { title: 'MFCC Coeff' }
  }];

  // 3D Spectral Surface Chart
  const surface3dData = [{
    z: specGrid.length > 0 ? specGrid : [[0, 0], [0, 0]],
    type: 'surface',
    colorscale: 'Viridis',
    showscale: false
  }];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800 }}>
          Audio Acoustic Explorer & Spectral Laboratory
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: 4 }}>
          High-resolution time-domain waveforms, STFT linear spectrograms, Log-Mel representations, and MFCC coefficient matrices.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
        {/* Left Column: Sample Audio Selector */}
        <div className="glass-panel" style={{ height: 'fit-content' }}>
          <div className="panel-header">
            <div className="panel-title">
              <Disc size={18} color="var(--accent-cyan)" />
              <span>Select Recording</span>
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {sampleAudios.length} loaded
            </span>
          </div>

          <div style={{ maxHeight: 520, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sampleAudios.map((s, idx) => {
              const isSelected = selectedFile?.file_name === s.file_name;
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedFile(s)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${isSelected ? 'rgba(6, 182, 212, 0.45)' : 'rgba(255, 255, 255, 0.06)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isSelected ? '#38bdf8' : '#f8fafc' }}>
                      {s.file_name}
                    </span>
                    <EmotionBadge emotion={s.emotion} />
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Actor #{s.actor_id} • {s.duration}s
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Audio Player & Spectral Visualizers */}
        <div>
          {/* Active Audio Playback Card */}
          {selectedFile && (
            <div className="glass-panel" style={{ padding: 20, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                    {selectedFile.file_name}
                  </h4>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Actor #{selectedFile.actor_id} • Intensity: {selectedFile.intensity || 'Normal'} • Duration: {selectedFile.duration}s
                  </div>
                </div>
                <EmotionBadge emotion={selectedFile.emotion} />
              </div>

              <AudioPlayer
                fileName={selectedFile.file_name}
                title={`Spoken: "${selectedFile.sentence_text || selectedFile.sentence_id}"`}
                duration={selectedFile.duration}
              />
            </div>
          )}

          {/* Visualizer Mode Tabs */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {[
              { id: 'waveform', label: 'Waveform (Time-Domain)', icon: Activity },
              { id: 'spectrogram', label: 'Spectrogram (STFT)', icon: Layers },
              { id: 'mfcc', label: 'MFCC Matrix (1-13)', icon: Disc },
              { id: '3d_surface', label: '3D Spectral Surface', icon: Sparkles }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeVizTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveVizTab(tab.id)}
                  className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.82rem', padding: '8px 14px' }}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Visualizer Container */}
          <div className="glass-panel">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
                <div className="status-dot pulse" style={{ width: 14, height: 14, margin: '0 auto 16px' }} />
                <span>Extracting Fourier transforms & Mel spectrograms...</span>
              </div>
            ) : (
              <>
                {activeVizTab === 'waveform' && (
                  <div>
                    <div className="panel-header">
                      <div className="panel-title">
                        <span>Time-Domain Decimated Amplitude Envelope</span>
                      </div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        Peak-Normalized
                      </span>
                    </div>
                    <PlotlyChart
                      data={waveformChartData}
                      layout={{
                        xaxis: { title: 'Time (Seconds)' },
                        yaxis: { title: 'Normalized Amplitude', range: [-1.05, 1.05] }
                      }}
                    />
                  </div>
                )}

                {activeVizTab === 'spectrogram' && (
                  <div>
                    <div className="panel-header">
                      <div className="panel-title">
                        <span>Short-Time Fourier Transform (STFT) Spectrogram</span>
                      </div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        n_fft = 1024, hop = 512
                      </span>
                    </div>
                    <PlotlyChart
                      data={spectrogramChartData}
                      layout={{
                        xaxis: { title: 'Time Frames' },
                        yaxis: { title: 'Frequency Bins (Hz)' }
                      }}
                    />
                  </div>
                )}

                {activeVizTab === 'mfcc' && (
                  <div>
                    <div className="panel-header">
                      <div className="panel-title">
                        <span>Mel-Frequency Cepstral Coefficients (MFCC 1–13)</span>
                      </div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        Acoustic Timbre Profile
                      </span>
                    </div>
                    <PlotlyChart
                      data={mfccChartData}
                      layout={{
                        xaxis: { title: 'Time Frames' },
                        yaxis: { title: 'MFCC Index (1–13)' }
                      }}
                    />
                  </div>
                )}

                {activeVizTab === '3d_surface' && (
                  <div>
                    <div className="panel-header">
                      <div className="panel-title">
                        <span>3D Spectral Energy Surface (Time × Frequency × dB)</span>
                      </div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        Interactive Rotation & Zoom
                      </span>
                    </div>
                    <PlotlyChart
                      data={surface3dData}
                      layout={{
                        scene: {
                          xaxis: { title: 'Time' },
                          yaxis: { title: 'Frequency' },
                          zaxis: { title: 'Power (dB)' },
                          camera: { eye: { x: 1.5, y: 1.5, z: 1.2 } }
                        },
                        margin: { t: 0, r: 0, b: 0, l: 0 }
                      }}
                      style={{ height: '480px' }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
