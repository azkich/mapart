import React from 'react';
import './ValidationError.css';

const ValidationError = ({ errors, onDismiss }) => {
  if (!errors || errors.length === 0) {
    return null;
  }

  return (
    <div className="validation-error">
      <div className="validation-error-content">
        <div className="validation-error-header">
          <h3>Validation errors</h3>
          {onDismiss && (
            <button 
              onClick={onDismiss}
              className="validation-error-close"
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>
        <ul className="validation-error-list">
          {errors.map((error, index) => (
            <li key={index} className="validation-error-item">
              {error}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ValidationError;
