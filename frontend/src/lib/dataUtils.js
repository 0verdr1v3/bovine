// NDVI color based on value
export const getNdviColor = (ndvi) => {
  if (ndvi >= 0.55) return 'hsl(152, 70%, 45%)';
  if (ndvi >= 0.42) return 'hsl(42, 82%, 53%)';
  if (ndvi >= 0.30) return 'hsl(30, 70%, 45%)';
  return 'hsl(15, 65%, 40%)';
};

// NDVI label based on value
export const getNdviLabel = (ndvi) => {
  if (ndvi >= 0.55) return 'Good pasture';
  if (ndvi >= 0.42) return 'Moderate';
  if (ndvi >= 0.30) return 'Stressed';
  return 'Degraded';
};

// NDVI CSS class for Tailwind
export const getNdviClass = (ndvi) => {
  if (ndvi >= 0.55) return 'ndvi-excellent';
  if (ndvi >= 0.42) return 'ndvi-moderate';
  if (ndvi >= 0.30) return 'ndvi-stressed';
  return 'ndvi-degraded';
};

// Water reliability color
export const getWaterColor = (reliability) => {
  if (reliability > 0.75) return 'hsl(200, 75%, 50%)';
  if (reliability > 0.5) return 'hsl(42, 82%, 53%)';
  return 'hsl(25, 60%, 40%)';
};

// Pressure level color
export const getPressureColor = (pressure) => {
  switch (pressure) {
    case 'Low': return 'hsl(152, 65%, 45%)';
    case 'Medium': return 'hsl(42, 82%, 53%)';
    case 'High': return 'hsl(0, 72%, 45%)';
    default: return 'hsl(200, 25%, 45%)';
  }
};

// Format number with commas
export const formatNumber = (num) => {
  return new Intl.NumberFormat().format(num);
};

// Format date for display
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

// Format time for display
export const formatTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
};

// Calculate movement pressure score
export const calculatePressureScore = (herd) => {
  const ndviFactor = (1 - herd.ndvi) * 0.4;
  const waterFactor = (1 - herd.water_days / 8) * 0.4;
  const speedFactor = (herd.speed / 20) * 0.2;
  return Math.round((ndviFactor + waterFactor + speedFactor) * 100);
};

// Direction arrow
export const getDirectionArrow = (trend) => {
  const arrows = {
    'N': '↑',
    'NE': '↗',
    'E': '→',
    'SE': '↘',
    'S': '↓',
    'SW': '↙',
    'W': '←',
    'NW': '↖',
  };
  return arrows[trend] || '→';
};

// Weather icon based on precipitation
export const getWeatherIcon = (precipitation) => {
  if (precipitation > 10) return '🌧️';
  if (precipitation > 2) return '🌦️';
  if (precipitation > 0) return '⛅';
  return '☀️';
};
