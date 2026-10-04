import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, MicOff, Upload, Play, Square, Activity, Sparkles, 
  Volume2, Clock, Globe, ShieldCheck, Zap, Disc, FileAudio, RefreshCw 
} from 'lucide-react';
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

export default function InferenceStudio({ onNavigate }) {
  const [activeInputTab, setActiveInputTab] = useState('upload'); // 'upload', 'mic', 'sample'
  const [selectedFile, setSelectedFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Microphone recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

  // Sample audios for 1-click test
  const [sampleAudios, setSampleAudios] = useState([]);
  const [loadingSamples, setLoadingSamples] = useState(false);

  useEffect(() => {
    loadSampleAudios();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    };
  }, []);

  const loadSampleAudios = async () => {
    setLoadingSamples(true);
    try {
      const res = await api.getSampleAudio(12);
      setSampleAudios(res.samples || []);
    } catch (e) {
      console.error('Failed to load sample audios:', e);
    } finally {
      setLoadingSamples(false);
    }
  };

  // Handle File Upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    processSelectedFile(file);
  };

  const processSelectedFile = (file) => {
    setSelectedFile(file);
    setError(null);
    setResult(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(file));
  };

  // Handle Drag & Drop
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  // Start Mic Recording
  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Audio visualizer setup
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      drawLiveWaveform();

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const file = new File([audioBlob], `recorded_${Date.now()}.wav`, { type: 'audio/wav' });
        processSelectedFile(file);
        stream.getTracks().forEach(track => track.stop());
        if (audioCtx.state !== 'closed') audioCtx.close();
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      setError('Microphone access denied or audio device not found. Please allow microphone permissions.');
    }
  };

  // Stop Mic Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const drawLiveWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const renderFrame = () => {
      animationFrameRef.current = requestAnimationFrame(renderFrame);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#06b6d4';
      ctx.beginPath();

      const sliceWidth = canvas.width * 1.0 / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    renderFrame();
  };

  // Select Sample Audio
  const handleSelectSample = async (sample) => {
    try {
      setAnalyzing(true);
      setError(null);
      const url = api.getAudioUrl(sample.file_name);
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], sample.file_name, { type: 'audio/wav' });
      processSelectedFile(file);
      await executeAnalyze(file);
    } catch (e) {
      setError(`Failed to load sample: ${e.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  // Execute Analysis API
  const handleAnalyzeClick = async () => {
    if (!selectedFile) return;
    setAnalyzing(true);
    setError(null);
    try {
      await executeAnalyze(selectedFile);
    } catch (e) {
      setError(e.message || 'Inference analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const executeAnalyze = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const data = await api.analyzeAudio(formData);
    setResult(data);
  };

  const cnnRes = result?.custom_emotion_result;
  const speechRes = result?.speech_intelligence;
  const viz = result?.visualizations;

  // Probability horizontal bar data
  const probList = cnnRes?.probabilities || [];

  // Plotly Radar Chart for Emotions
  const radarChartData = probList.length > 0 ? [{
    type: 'scatterpolar',
    r: probList.map(p => p.percentage),
    theta: probList.map(p => p.emotion),
    fill: 'toself',
    fillcolor: 'rgba(6, 182, 212, 0.25)',
    line: { color: '#06b6d4', width: 2 },
    marker: { color: '#38bdf8', size: 6 }
  }] : [];

  const radarLayout = {
    polar: {
      radialaxis: {
        visible: true,
        range: [0, 100],
        tickfont: { color: '#94a3b8', size: 10 },
        gridcolor: 'rgba(255, 255, 255, 0.08)'
      },
      angularaxis: {
        tickfont: { color: '#f8fafc', size: 11, family: 'Outfit' },
        gridcolor: 'rgba(255, 255, 255, 0.08)'
      },
      bgcolor: 'transparent'
    },
    margin: { t: 24, r: 24, b: 24, l: 24 }
  };

  return (
    <div>
      {/* Studio Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 20, background: 'rgba(139, 92, 246, 0.12)', border: '1px solid rgba(139, 92, 246, 0.3)', marginBottom: 10 }}>
            <Mic size={14} color="var(--accent-violet)" />
            <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--accent-violet)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Dual-System Speech Intelligence
            </span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800 }}>
            🎙️ Voice Intelligence Studio
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: 4 }}>
            Zero-shot multilingual ASR, LID, and Audio Event Detection via <strong>SenseVoiceSmall</strong> paired with our custom <strong>PyTorch 2D-CNN</strong> emotion classifier.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <span className="status-pill">
            <span className="status-dot pulse" />
            CPU Inference Ready
          </span>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          <strong>Inference Error:</strong> {error}
        </div>
      )}

      {/* Input Selector Tabs */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <button
            className={`btn ${activeInputTab === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveInputTab('upload')}
          >
            <Upload size={16} />
            <span>Upload Audio File</span>
          </button>

          <button
            className={`btn ${activeInputTab === 'mic' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveInputTab('mic')}
          >
            <Mic size={16} />
            <span>Record from Microphone</span>
          </button>

          <button
            className={`btn ${activeInputTab === 'sample' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveInputTab('sample')}
          >
            <Disc size={16} />
            <span>Test CREMA-D Samples</span>
          </button>
        </div>

        {/* Tab 1: File Upload */}
        {activeInputTab === 'upload' && (
          <div>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              style={{
                border: '2px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '40px 20px',
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.015)',
                cursor: 'pointer',
                transition: 'border-color 0.2s'
              }}
              onClick={() => document.getElementById('audio-upload-input').click()}
            >
              <input
                id="audio-upload-input"
                type="file"
                accept=".wav,.mp3,.flac,.ogg,.m4a"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <FileAudio size={42} color="var(--accent-cyan)" style={{ margin: '0 auto 12px', opacity: 0.85 }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 6 }}>
                Drop an audio file here or click to browse
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                Supports WAV, MP3, FLAC, OGG, M4A (16 kHz mono recommended for highest fidelity)
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Microphone Recording */}
        {activeInputTab === 'mic' && (
          <div style={{ textAlign: 'center', padding: '24px 16px' }}>
            <div style={{ marginBottom: 20 }}>
              <canvas
                ref={canvasRef}
                width={560}
                height={90}
                style={{
                  width: '100%',
                  maxWidth: 560,
                  height: 90,
                  borderRadius: 'var(--radius-md)',
                  background: '#0a0f1d',
                  border: '1px solid var(--border-subtle)'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
              {!isRecording ? (
                <button
                  className="btn btn-primary"
                  onClick={startRecording}
                  style={{ background: 'var(--accent-rose)', borderColor: 'var(--accent-rose)', padding: '12px 28px' }}
                >
                  <Mic size={18} />
                  <span>Start Recording</span>
                </button>
              ) : (
                <button
                  className="btn"
                  onClick={stopRecording}
                  style={{ background: 'var(--accent-amber)', color: '#000', padding: '12px 28px', fontWeight: 700 }}
                >
                  <Square size={18} />
                  <span>Stop Recording ({recordingSeconds}s)</span>
                </button>
              )}
            </div>
            {isRecording && (
              <p style={{ color: 'var(--accent-rose)', fontSize: '0.85rem', marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span className="status-dot pulse" style={{ background: 'var(--accent-rose)' }} />
                Recording live audio stream from microphone... Speak now!
              </p>
            )}
          </div>
        )}

        {/* Tab 3: Test Samples */}
        {activeInputTab === 'sample' && (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginBottom: 14 }}>
              Click any verified CREMA-D speech sample to load and analyze instantly:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
              {sampleAudios.map((s, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectSample(s)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s'
                  }}
                  className="hover-glow"
                >
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                      {s.file_name}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Actor #{s.actor_id} • {s.duration}s
                    </div>
                  </div>
                  <EmotionBadge emotion={s.emotion} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audio Player & Trigger Row */}
        {selectedFile && (
          <div style={{ marginTop: 24, padding: '16px 20px', borderRadius: 'var(--radius-md)', background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Volume2 size={24} color="var(--accent-cyan)" />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                  {selectedFile.name}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Size: {(selectedFile.size / 1024).toFixed(1)} KB
                </div>
              </div>
            </div>

            {audioUrl && (
              <audio controls src={audioUrl} style={{ height: 36, maxWidth: 300 }} />
            )}

            <button
              className="btn btn-primary"
              onClick={handleAnalyzeClick}
              disabled={analyzing}
              style={{ minWidth: 160 }}
            >
              {analyzing ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Zap size={16} />
                  <span>Run Intelligence</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Analysis Results Display */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Telemetry Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            <div className="card" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Inference Latency</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: 4 }}>
                {result.processing_time_seconds}s
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>CPU execution time</div>
            </div>

            <div className="card" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Audio Duration</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-violet)', marginTop: 4 }}>
                {result.duration_seconds}s
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>@ {result.sample_rate} Hz</div>
            </div>

            <div className="card" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Predicted Emotion</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: EMOTION_COLORS[cnnRes?.predicted_emotion] || '#fff', marginTop: 4 }}>
                {cnnRes?.predicted_emotion || 'Unknown'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Custom 2D-CNN Model</div>
            </div>

            <div className="card" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Confidence</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: 4 }}>
                {cnnRes?.confidence_percent}%
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Softmax confidence</div>
            </div>
          </div>

          {/* Dual Intelligence Row: SenseVoiceSmall + PyTorch CNN */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20 }}>
            {/* System A: SenseVoiceSmall Intelligence */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Globe size={18} color="var(--accent-violet)" />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                    Pretrained Multilingual Speech Intelligence
                  </h3>
                </div>
                <span className="badge badge-purple" style={{ fontSize: '0.72rem' }}>
                  SenseVoiceSmall
                </span>
              </div>

              {speechRes?.is_ready ? (
                <div>
                  {/* Language & Audio Events */}
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                    <div style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Detected Language</span>
                      <strong style={{ color: 'var(--accent-cyan)', fontSize: '0.94rem' }}>{speechRes.detected_language}</strong>
                    </div>

                    <div style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Detected Emotion Tag</span>
                      <strong style={{ color: 'var(--accent-amber)', fontSize: '0.94rem' }}>{speechRes.detected_emotion}</strong>
                    </div>

                    <div style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Acoustic Events</span>
                      <strong style={{ color: 'var(--accent-emerald)', fontSize: '0.94rem' }}>
                        {speechRes.audio_events?.join(', ') || 'Clean Speech'}
                      </strong>
                    </div>
                  </div>

                  {/* Transcription Display */}
                  <div style={{ marginTop: 12 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
                      Automatic Speech Recognition (ASR Transcription)
                    </span>
                    <div style={{
                      padding: '16px 20px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(0, 0, 0, 0.35)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '1.05rem',
                      lineHeight: '1.6',
                      color: '#f8fafc',
                      minHeight: 64
                    }}>
                      "{speechRes.transcription}"
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '24px 16px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)' }}>
                  <Globe size={32} color="var(--accent-violet)" style={{ opacity: 0.6, margin: '0 auto 10px' }} />
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                    {speechRes?.message || 'SenseVoiceSmall multilingual engine initializing in background on CPU.'}
                  </p>
                </div>
              )}
            </div>

            {/* System B: Custom PyTorch CNN Emotion Probabilities */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Activity size={18} color="var(--accent-cyan)" />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                    Custom PyTorch Emotion Classifier
                  </h3>
                </div>
                <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>
                  CREMA-D Calibrated
                </span>
              </div>

              {/* Horizontal Probability Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {probList.map((p, idx) => (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: 4 }}>
                      <span style={{ fontWeight: p.emotion === cnnRes?.predicted_emotion ? 700 : 500, color: EMOTION_COLORS[p.emotion] }}>
                        {p.emotion} {p.emotion === cnnRes?.predicted_emotion && '★'}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {p.percentage}%
                      </span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: 'rgba(255, 255, 255, 0.06)', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${p.percentage}%`,
                          borderRadius: 4,
                          background: EMOTION_COLORS[p.emotion] || 'var(--accent-cyan)',
                          transition: 'width 0.4s ease'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Radar Chart & Spectrogram Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20 }}>
            {/* Emotion Radar Geometry */}
            <div className="card">
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14 }}>
                Emotion Confidence Distribution (Radar Profile)
              </h3>
              <PlotlyChart
                data={radarChartData}
                layout={radarLayout}
                style={{ height: 320 }}
              />
            </div>

            {/* In-Depth Mel Spectrogram Visual */}
            <div className="card">
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14 }}>
                Acoustic Spectrogram (Power dB)
              </h3>
              {viz?.spectrogram ? (
                <PlotlyChart
                  data={[{
                    z: viz.spectrogram,
                    type: 'heatmap',
                    colorscale: 'Viridis',
                    colorbar: { title: 'dB' }
                  }]}
                  layout={{
                    margin: { t: 10, r: 10, b: 35, l: 45 },
                    xaxis: { title: 'Time Frames' },
                    yaxis: { title: 'Frequency Bins' }
                  }}
                  style={{ height: 320 }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                  Spectrogram computed during analysis
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
