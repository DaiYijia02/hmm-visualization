import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navigation.css';

const Navigation = () => {
  const navItems = [
    { path: '/unified', label: '🎯 HMM Analysis Dashboard', description: 'Category-based analysis with dynamic filtering for all HMM research data', featured: true }
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
              `nav-card ${isActive ? 'nav-card-active' : ''} ${item.featured ? 'nav-card-featured' : ''}`
            }
          >
            <div className="nav-card-content">
              <h3 className="nav-card-title">{item.label}</h3>
              <p className="nav-card-description">{item.description}</p>
              {item.featured && <div className="featured-badge">NEW</div>}
            </div>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;