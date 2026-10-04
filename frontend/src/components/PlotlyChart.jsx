import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';

export default function PlotlyChart({ data = [], layout = {}, config = {}, style = {}, className = '' }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const darkLayoutDefaults = {
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: {
        family: 'Inter, sans-serif',
        color: '#94a3b8',
        size: 11
      },
      margin: { t: 36, r: 24, b: 40, l: 48 },
      xaxis: {
        gridcolor: 'rgba(255, 255, 255, 0.05)',
        zerolinecolor: 'rgba(255, 255, 255, 0.1)',
        tickfont: { color: '#94a3b8' }
      },
      yaxis: {
        gridcolor: 'rgba(255, 255, 255, 0.05)',
        zerolinecolor: 'rgba(255, 255, 255, 0.1)',
        tickfont: { color: '#94a3b8' }
      },
      hoverlabel: {
        bgcolor: '#0f172a',
        bordercolor: '#06b6d4',
        font: { color: '#f8fafc', family: 'Inter' }
      },
      ...layout
    };

    const defaultConfig = {
      responsive: true,
      displayModeBar: true,
      modeBarButtonsToRemove: ['lasso2d', 'select2d'],
      displaylogo: false,
      toImageButtonOptions: {
        format: 'png',
        filename: 'cognivision_chart',
        height: 600,
        width: 900,
        scale: 2
      },
      ...config
    };

    Plotly.newPlot(containerRef.current, data, darkLayoutDefaults, defaultConfig);

    const handleResize = () => {
      if (containerRef.current) {
        Plotly.Plots.resize(containerRef.current);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        Plotly.purge(containerRef.current);
      }
    };
  }, [data, layout, config]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '360px', ...style }}
      className={`plotly-chart-wrapper ${className}`}
    />
  );
}
