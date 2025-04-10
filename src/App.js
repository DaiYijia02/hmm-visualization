import React from 'react';
import MultiModelHMMDashboard from './MultiModelHMMDashboard';
import ExtendHMMDashboard from './ExtendHMMDashboard';
import Extend2HMMDashboard from './Extend2HMMDashboard';
import HMMVisualizer from './320HMMDashboard';
import HMMVisualizer2 from './327HMMDashboard';

function App() {
  return (
    <div className="App">
      <MultiModelHMMDashboard />
      <ExtendHMMDashboard />
      <Extend2HMMDashboard />
      <HMMVisualizer />
      <HMMVisualizer2 />
    </div>
  );
}

export default App;