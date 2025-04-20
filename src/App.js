import React from 'react';
import MultiModelHMMDashboard from './MultiModelHMMDashboard';
import ExtendHMMDashboard from './ExtendHMMDashboard';
import Extend2HMMDashboard from './Extend2HMMDashboard';
import HMMVisualizer from './320HMMDashboard';
import HMMVisualizer2 from './327HMMDashboard';
import GeneralEntropy from './GeneralEntropy';
import GeneralLambda from './GeneralLambda';
import GeneralSteadyState from './GeneralSteadyState';

function App() {
  return (
    <div className="App">
      <MultiModelHMMDashboard />
      <ExtendHMMDashboard />
      <Extend2HMMDashboard />
      <HMMVisualizer />
      <HMMVisualizer2 />
      <GeneralEntropy />
      <GeneralLambda />
      <GeneralSteadyState />
    </div>
  );
}

export default App;