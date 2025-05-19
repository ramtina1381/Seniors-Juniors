import React from 'react';

const ProcessButton = ({ onClick, disabled, loading }) => {
  return (
    <button 
      className="process-button" 
      onClick={onClick} 
      disabled={disabled}
    >
      {loading ? 'Processing...' : 'Process Equipment Data'}
    </button>
  );
};

export default ProcessButton;


