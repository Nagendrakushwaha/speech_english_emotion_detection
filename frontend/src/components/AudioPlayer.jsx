import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Volume2 } from 'lucide-react';
import { api } from '../services/api';

export default function AudioPlayer({ fileName, title, emotion, duration }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const audioRef = useRef(null);

  const audioSrc = fileName ? api.getAudioUrl(fileName) : null;

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [fileName]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !totalDuration) {
        setTotalDuration(audioRef.current.duration);
      }
    }
  };

  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="audio-player-card">
      <audio
        ref={audioRef}
        src={audioSrc}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={(e) => setTotalDuration(e.target.duration)}
        onEnded={handleEnded}
        preload="metadata"
      />

      <button
        onClick={togglePlay}
        className="audio-play-btn"
        title={isPlaying ? 'Pause' : 'Play audio'}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
      </button>

      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
            {title || fileName}
          </span>
          <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </span>
        </div>

        <input
          type="range"
          min="0"
          max={totalDuration || 1}
          step="0.01"
          value={currentTime}
          onChange={handleSeek}
          style={{
            width: '100%',
            height: '4px',
            accentColor: 'var(--accent-cyan)',
            cursor: 'pointer'
          }}
        />
      </div>

      {audioSrc && (
        <a
          href={audioSrc}
          download={fileName}
          className="btn btn-secondary btn-sm"
          style={{ padding: '6px 8px', borderRadius: '6px' }}
          title="Download audio file"
        >
          <Download size={14} />
        </a>
      )}
    </div>
  );
}
