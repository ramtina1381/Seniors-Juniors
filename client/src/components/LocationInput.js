import React from 'react';

const LocationInput = ({ value, onChange }) => {
  return (
    <div className="location-input">
      <label>
        Location Number:
        <input 
          type="text" 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter location number"
        />
      </label>
    </div>
  );
};

export default LocationInput;