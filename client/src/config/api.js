// API Configuration for different environments
const API_CONFIG = {
  // Development (local)
  development: {
    baseURL: 'http://localhost:5003',
    apiPrefix: '/api'
  },
  
  // Production (Vercel)
  production: {
    baseURL: 'https://seniors-juniors-server.vercel.app',
    apiPrefix: '/api'
  }
};

// Get current environment
const getEnvironment = () => {
  // Check if we're in production (Vercel)
  if (window.location.hostname.includes('vercel.app')) {
    return 'production';
  }
  
  // Check for localhost (development)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'development';
  }
  
  // Default to production for deployed apps
  return 'production';
};

// Get current API configuration
const getApiConfig = () => {
  const env = getEnvironment();
  return API_CONFIG[env];
};

// Helper function to build API URLs
export const buildApiUrl = (endpoint) => {
  const config = getApiConfig();
  return `${config.baseURL}${config.apiPrefix}${endpoint}`;
};

// Helper function to build full URLs
export const buildUrl = (endpoint) => {
  const config = getApiConfig();
  return `${config.baseURL}${endpoint}`;
};

// Export the current configuration
export const apiConfig = getApiConfig();

// Export individual values for convenience
export const API_BASE_URL = apiConfig.baseURL;
export const API_PREFIX = apiConfig.apiPrefix;

export default apiConfig;
