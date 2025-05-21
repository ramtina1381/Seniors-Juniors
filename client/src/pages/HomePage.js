// Home.js
import React from 'react';
import { useNavigate } from 'react-router-dom';

function HomePage() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Welcome to the Field Operations Portal</h1>
      <p style={styles.subtitle}>Select a module to proceed</p>
      <div style={styles.buttonGroup}>
        <button style={styles.button} onClick={() => navigate('/decoms')}>
          Decoms & Returns
        </button>
        <button style={styles.button} onClick={() => navigate('/jha')}>
          Job Hazard Analysis (JHA)
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: '50px',
    fontFamily: 'Arial, sans-serif',
  },
  title: {
    fontSize: '2.5rem',
    marginBottom: '10px',
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: '1.2rem',
    marginBottom: '30px',
    color: '#555',
  },
  buttonGroup: {
    display: 'flex',
    gap: '20px',
  },
  button: {
    padding: '15px 30px',
    fontSize: '1rem',
    backgroundColor: '#2980b9',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
};

export default HomePage;
