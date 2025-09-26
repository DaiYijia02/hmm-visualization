import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HMMDashboard from './components/HMMDashboard';
import ExperimentalDashboard from './components/ExperimentalDashboard';
import './App.css';

function App() {
  return (
    <Router basename="/hmm-visualization">
      <div className="App">
        <Routes>
          <Route path="/" element={<HMMDashboard />} />
          <Route path="/experimental" element={<ExperimentalDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;