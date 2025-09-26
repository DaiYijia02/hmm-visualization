import React from 'react';
import HMMDashboard from './HMMDashboard';
import './ExperimentalDashboard.css';

const ExperimentalDashboard = () => {
  return (
    <div className="experimental-dashboard">
      <div className="experimental-header">
        <h1>🧪 Experimental HMM Dashboard</h1>
        <p>Latest features and experimental visualizations for HMM analysis</p>
      </div>
      <HMMDashboard showExperimental={true} />
    </div>
  );
};

export default ExperimentalDashboard;