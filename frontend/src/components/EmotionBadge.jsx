import React from 'react';

const EMOTION_CLASS_MAP = {
  Angry: 'badge-Angry',
  ANG: 'badge-Angry',
  Disgust: 'badge-Disgust',
  DIS: 'badge-Disgust',
  Fear: 'badge-Fear',
  FEA: 'badge-Fear',
  Happy: 'badge-Happy',
  HAP: 'badge-Happy',
  Neutral: 'badge-Neutral',
  NEU: 'badge-Neutral',
  Sad: 'badge-Sad',
  SAD: 'badge-Sad'
};

export default function EmotionBadge({ emotion }) {
  if (!emotion) return null;
  const cls = EMOTION_CLASS_MAP[emotion] || 'badge-Neutral';
  return (
    <span className={`badge-emotion ${cls}`}>
      {emotion}
    </span>
  );
}
