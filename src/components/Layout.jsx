import React from 'react';
import { Link } from 'react-router-dom';
import './Navigation.css';

const Layout = ({ children, title, showBackButton = true }) => {
  return (
    <div className="layout">
      {showBackButton && (
        <Link to="/" className="back-to-nav">
          Back to Dashboard
        </Link>
      )}

      {title && (
        <div className="page-header">
          <h1 className="page-title">{title}</h1>
        </div>
      )}

      <div className="page-content">
        {children}
      </div>
    </div>
  );
};

export default Layout;