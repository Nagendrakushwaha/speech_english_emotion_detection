import React, { useState, useEffect } from 'react';
import { 
  Home, Database, AudioWaveform, Layers, PlaySquare, Award, 
  AlertTriangle, Cpu, Mic, Zap, History, Settings as SettingsIcon,
  Activity, Globe, ShieldCheck, Download, ExternalLink, Menu, X, Sparkles
} from 'lucide-react';

import LandingOverview from './pages/LandingOverview';
import DatasetLab from './pages/DatasetLab';
import AudioExplorer from './pages/AudioExplorer';
import FeatureLab from './pages/FeatureLab';
import TrainingStudio from './pages/TrainingStudio';
import EvaluationCenter from './pages/EvaluationCenter';
import ErrorAnalysis from './pages/ErrorAnalysis';
import ModelLaboratory from './pages/ModelLaboratory';
import InferenceStudio from './pages/InferenceStudio';
import PerformanceLab from './pages/PerformanceLab';
import ExperimentHistory from './pages/ExperimentHistory';
import Settings from './pages/Settings';

import { api } from './services/api';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Global telemetry state
  const [summary, setSummary] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [benchmark, setBenchmark] = useState(null);
  const [health, setHealth] = useState(null);
  const [sampleAudios, setSampleAudios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGlobalTelemetry();
    const interval = setInterval(checkHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  const loadGlobalTelemetry = async () => {
    setLoading(true);
    try {
      const [sumRes, evalRes, benchRes, healthRes, samplesRes] = await Promise.all([
        api.getDatasetSummary().catch(() => null),
        api.getLatestEvaluation().catch(() => null),
        api.getBenchmark().catch(() => null),
        api.getHealth().catch(() => null),
        api.getSampleAudio(50).catch(() => ({ samples: [] }))
      ]);

      setSummary(sumRes);
      setEvaluation(evalRes);
      setBenchmark(benchRes);
      setHealth(healthRes);
      setSampleAudios(samplesRes?.samples || []);
    } catch (e) {
      console.error('Failed to load global telemetry:', e);
    } finally {
      setLoading(false);
    }
  };

  const checkHealth = async () => {
    try {
      const res = await api.getHealth();
      setHealth(res);
    } catch (e) {
      setHealth(null);
    }
  };

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: Home, badge: null },
    { id: 'dataset', label: 'Dataset Lab', icon: Database, badge: summary?.total_files ? `${summary.total_files}` : null },
    { id: 'audio', label: 'Audio Explorer', icon: AudioWaveform, badge: null },
    { id: 'features', label: 'Feature Lab (3D)', icon: Layers, badge: '3D' },
    { id: 'training', label: 'Training Studio', icon: PlaySquare, badge: null },
    { id: 'evaluation', label: 'Evaluation Center', icon: Award, badge: evaluation?.metrics ? `${evaluation.metrics.accuracy}%` : null },
    { id: 'error_analysis', label: 'Error Analysis', icon: AlertTriangle, badge: evaluation?.error_samples ? `${evaluation.error_samples}` : null },
    { id: 'models', label: 'Model Laboratory', icon: Cpu, badge: null },
    { id: 'inference', label: 'Voice Studio', icon: Mic, badge: 'Live' },
    { id: 'performance', label: 'Performance Lab', icon: Zap, badge: 'CPU' },
    { id: 'experiments', label: 'Experiment History', icon: History, badge: null },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, badge: null },
  ];

  return (
    <div className="app-shell" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Sidebar Navigation */}
      <aside
        style={{
          width: sidebarOpen ? '260px' : '72px',
          minWidth: sidebarOpen ? '260px' : '72px',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.25s ease',
          zIndex: 40,
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto'
        }}
      >
        {/* Brand Header */}
        <div style={{ padding: '20px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(6, 182, 212, 0.4)'
            }}>
              <Mic size={20} color="#ffffff" />
            </div>
            {sidebarOpen && (
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.96rem', letterSpacing: '0.04em', color: '#ffffff' }}>
                  COGNIVISION
                </div>
                <div style={{ fontSize: '0.66rem', color: 'var(--text-cyan)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Voice Intelligence
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Nav List */}
        <nav style={{ padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: sidebarOpen ? '10px 14px' : '10px 0',
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                  borderRadius: 'var(--radius-md)',
                  border: isActive ? '1px solid rgba(6, 182, 212, 0.35)' : '1px solid transparent',
                  background: isActive ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.84rem',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                  position: 'relative'
                }}
                className={!isActive ? 'hover-bg' : ''}
                title={item.label}
              >
                <Icon size={18} color={isActive ? 'var(--accent-cyan)' : 'currentColor'} />
                {sidebarOpen && (
                  <span style={{ flex: 1, whiteSpace: 'nowrap' }}>
                    {item.label}
                  </span>
                )}
                {sidebarOpen && item.badge && (
                  <span style={{
                    fontSize: '0.68rem',
                    padding: '2px 7px',
                    borderRadius: 10,
                    background: isActive ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.08)',
                    color: isActive ? '#000' : 'var(--text-secondary)',
                    fontWeight: 700
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Telemetry Footer */}
        {sidebarOpen && (
          <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border-subtle)', background: 'rgba(0, 0, 0, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>Backend Core:</span>
              <span style={{ color: health ? 'var(--accent-emerald)' : 'var(--accent-rose)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span className="status-dot pulse" style={{ background: health ? 'var(--accent-emerald)' : 'var(--accent-rose)' }} />
                {health ? 'Online' : 'Connecting...'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Target:</span>
              <span style={{ color: 'var(--text-secondary)' }}>CPU (AMD Ryzen)</span>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Command Bar */}
        <header
          style={{
            height: '64px',
            background: 'rgba(13, 18, 31, 0.85)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--border-subtle)',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 30
          }}
        >
          {/* Active Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Cognivision Lab
            </span>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-cyan)' }}>
              {navigationItems.find(i => i.id === activeTab)?.label}
            </span>
          </div>

          {/* Real-Time System Telemetry Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="status-pill" style={{ display: 'none', md: 'flex' }}>
              <span className="status-dot pulse" />
              <span>AMD Ryzen 5 • CPU Mode</span>
            </div>

            <div className="status-pill">
              <span className="status-dot" style={{ background: 'var(--accent-violet)' }} />
              <span>SenseVoice: {health?.sensevoice_status || 'Ready'}</span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <a
                href={api.getExportUrl('report')}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                title="Download Full Evaluation Report"
              >
                <Download size={14} />
                <span>Report</span>
              </a>

              <button
                className="btn btn-primary"
                onClick={() => setActiveTab('inference')}
                style={{ padding: '6px 14px', fontSize: '0.78rem' }}
              >
                <Mic size={14} />
                <span>Voice Studio</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content Container */}
        <main style={{ flex: 1, padding: '28px 32px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
          {activeTab === 'overview' && (
            <LandingOverview
              summary={summary}
              evaluation={evaluation}
              benchmark={benchmark}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'dataset' && (
            <DatasetLab
              summary={summary}
              onRescan={loadGlobalTelemetry}
            />
          )}

          {activeTab === 'audio' && (
            <AudioExplorer
              sampleAudios={sampleAudios}
            />
          )}

          {activeTab === 'features' && (
            <FeatureLab />
          )}

          {activeTab === 'training' && (
            <TrainingStudio />
          )}

          {activeTab === 'evaluation' && (
            <EvaluationCenter
              evaluation={evaluation}
              onReevaluate={loadGlobalTelemetry}
            />
          )}

          {activeTab === 'error_analysis' && (
            <ErrorAnalysis
              evaluation={evaluation}
              onReevaluate={loadGlobalTelemetry}
            />
          )}

          {activeTab === 'models' && (
            <ModelLaboratory
              evaluation={evaluation}
            />
          )}

          {activeTab === 'inference' && (
            <InferenceStudio
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'performance' && (
            <PerformanceLab />
          )}

          {activeTab === 'experiments' && (
            <ExperimentHistory
              onPipelineComplete={loadGlobalTelemetry}
            />
          )}

          {activeTab === 'settings' && (
            <Settings
              summary={summary}
              onRescan={loadGlobalTelemetry}
            />
          )}
        </main>
      </div>
    </div>
  );
}
