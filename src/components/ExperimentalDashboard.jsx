import React from 'react';
import HMMDashboard from './HMMDashboard';
import './ExperimentalDashboard.css';

const ExperimentalDashboard = () => {
  return (
    <div className="experimental-dashboard">
      <div className="experimental-header">
        <h1>🧪 Experimental HMM Dashboard</h1>
        <p>Add new trained model evals to compare to the baselines</p>
      </div>
      <HMMDashboard showExperimental={true} />
    </div>
  );
};

export default ExperimentalDashboard;