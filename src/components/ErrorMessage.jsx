import React from 'react';
import './ErrorMessage.css';

const ErrorMessage = ({
  error,
  title = 'Error',
  showRetry = true,
  onRetry = null,
  variant = 'default' // 'default', 'warning', 'critical'
}) => {
  const getErrorMessage = (error) => {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    return 'An unexpected error occurred. Please try again.';
  };

  const getIconForVariant = (variant) => {
    switch (variant) {
      case 'warning':
        return '⚠️';
      case 'critical':
        return '🚫';
      default:
        return '❌';
    }
  };

  return (
    <div className={`error-message error-message-${variant}`}>
      <div className="error-message-content">
        <div className="error-message-icon">
          {getIconForVariant(variant)}
        </div>

        <div className="error-message-text">
          <h3 className="error-message-title">{title}</h3>
          <p className="error-message-description">
            {getErrorMessage(error)}
          </p>
        </div>

        {showRetry && onRetry && (
          <div className="error-message-actions">
            <button
              className="error-retry-button"
              onClick={onRetry}
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {process.env.NODE_ENV === 'development' && error?.stack && (
        <details className="error-message-details">
          <summary>Technical details (development only)</summary>
          <pre className="error-message-stack">{error.stack}</pre>
        </details>
      )}
    </div>
  );
};

export default ErrorMessage;