import React from 'react';
import { Check } from 'lucide-react';

export default function StatusTracker({ status }) {
  const normalizedStatus = (status || 'Pending').toLowerCase();

  // Status mapping
  // 'pending' -> step 1 active
  // 'assigned' -> step 1, 2 active
  // 'completed' -> step 1, 2, 3 completed
  let activeIndex = 0;
  if (normalizedStatus === 'assigned') {
    activeIndex = 1;
  } else if (normalizedStatus === 'completed') {
    activeIndex = 2;
  }

  const steps = [
    {
      step: 1,
      title: 'Pending',
      desc: 'Received and queued',
    },
    {
      step: 2,
      title: 'Assigned',
      desc: 'Worker is reviewing cleaning methods',
    },
    {
      step: 3,
      title: 'Completed',
      desc: 'Cleaned and verified',
    },
  ];

  // Active line width:
  // index 0 -> 0%
  // index 1 -> 50%
  // index 2 -> 100%
  const lineWidthPercent = activeIndex === 0 ? 0 : activeIndex === 1 ? 50 : 100;

  return (
    <div className="stepper-wrapper">
      <div className="stepper-container">
        {/* Background gray connecting line */}
        <div className="stepper-line-bg" />
        
        {/* Active green connecting line */}
        <div 
          className="stepper-line-active" 
          style={{ width: `calc(${lineWidthPercent}% * 0.85)` }}
        />

        {steps.map((s, idx) => {
          const isDoneOrActive = idx <= activeIndex;
          return (
            <div key={s.step} className="step-item">
              <div className={`step-circle ${isDoneOrActive ? 'completed' : ''}`}>
                {isDoneOrActive ? (
                  <Check size={16} strokeWidth={3} />
                ) : (
                  <span>{s.step}</span>
                )}
              </div>
              <div className="step-title">{s.title}</div>
              <div className="step-desc">{s.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
