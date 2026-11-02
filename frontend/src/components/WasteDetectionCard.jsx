import React from 'react';

export default function WasteDetectionCard({ category, count, confidence }) {
  // Convert confidence (0.0 to 1.0) to percentage width
  const percent = Math.min(Math.max(Math.round((confidence || 0.85) * 100), 15), 100);

  return (
    <div className="waste-card">
      <div className="waste-card-top">
        <span className="waste-card-name">{category}</span>
        <span className="waste-card-count">×{count}</span>
      </div>
      <div className="waste-progress-track">
        <div 
          className="waste-progress-fill" 
          style={{ width: `${percent}%` }}
          title={`Confidence: ${percent}%`}
        />
      </div>
    </div>
  );
}
