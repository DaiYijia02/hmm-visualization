import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import MultiModelHMMDashboard from './MultiModelHMMDashboard';
import ExtendHMMDashboard from './ExtendHMMDashboard';
import Extend2HMMDashboard from './Extend2HMMDashboard';
import HMMVisualizer from './320HMMDashboard';
import HMMVisualizer2 from './327HMMDashboard';
import GeneralEntropy from './GeneralEntropy';
import GeneralLambda from './GeneralLambda';
import GeneralSteadyState from './GeneralSteadyState';
import './App.css';

function App() {
  return (
    <ErrorBoundary fallbackMessage="The HMM Visualization Dashboard encountered an unexpected error. Please refresh the page to try again.">
      <Router basename="/hmm-visualization">
        <div className="App">
        <Routes>
          <Route path="/" element={<Navigation />} />
          <Route
            path="/multi-model"
            element={
              <Layout title="Multi-Model HMM Analysis">
                <MultiModelHMMDashboard />
              </Layout>
            }
          />
          <Route
            path="/extend"
            element={
              <Layout title="Extended HMM Analysis">
                <ExtendHMMDashboard />
              </Layout>
            }
          />
          <Route
            path="/extend2"
            element={
              <Layout title="Extended HMM Analysis (Variant 2)">
                <Extend2HMMDashboard />
              </Layout>
            }
          />
          <Route
            path="/hmm-320"
            element={
              <Layout title="HMM 320 Dataset Analysis">
                <HMMVisualizer />
              </Layout>
            }
          />
          <Route
            path="/hmm-327"
            element={
              <Layout title="HMM 327 Dataset Analysis">
                <HMMVisualizer2 />
              </Layout>
            }
          />
          <Route
            path="/entropy"
            element={
              <Layout title="General Entropy Analysis">
                <GeneralEntropy />
              </Layout>
            }
          />
          <Route
            path="/lambda"
            element={
              <Layout title="Lambda2 Eigenvalue Analysis">
                <GeneralLambda />
              </Layout>
            }
          />
          <Route
            path="/steady-state"
            element={
              <Layout title="Steady State Analysis">
                <GeneralSteadyState />
              </Layout>
            }
          />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;