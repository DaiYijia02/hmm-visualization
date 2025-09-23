import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navigation.css';

const Navigation = () => {
  const navItems = [
    { path: '/multi-model', label: 'Multi-Model Analysis', description: 'Compare multiple HMM models' },
    { path: '/extend', label: 'Extended Analysis', description: 'Extended HMM analysis' },
    { path: '/extend2', label: 'Extended Analysis 2', description: 'Extended HMM analysis (variant 2)' },
    { path: '/hmm-320', label: 'HMM 320 Analysis', description: 'HMM analysis for 320 dataset' },
    { path: '/hmm-327', label: 'HMM 327 Analysis', description: 'HMM analysis for 327 dataset' },
    { path: '/entropy', label: 'Entropy Analysis', description: 'General entropy visualization' },
    { path: '/lambda', label: 'Lambda Analysis', description: 'Lambda2 eigenvalue analysis' },
    { path: '/steady-state', label: 'Steady State', description: 'Steady state analysis' }
  ];

  return (
    <nav className="navigation">
      <div className="nav-header">
        <h1 className="nav-title">HMM Visualization Dashboard</h1>
        <p className="nav-subtitle">Hidden Markov Model Analysis Tools</p>
      </div>

      <div className="nav-grid">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-card ${isActive ? 'nav-card-active' : ''}`
            }
          >
            <div className="nav-card-content">
              <h3 className="nav-card-title">{item.label}</h3>
              <p className="nav-card-description">{item.description}</p>
            </div>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;