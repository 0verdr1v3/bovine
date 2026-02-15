import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DataContext = createContext(null);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [herds, setHerds] = useState([]);
  const [weather, setWeather] = useState(null);
  const [weatherMulti, setWeatherMulti] = useState([]);
  const [waterSources, setWaterSources] = useState([]);
  const [grazingRegions, setGrazingRegions] = useState([]);
  const [corridors, setCorridors] = useState([]);
  const [ndviZones, setNdviZones] = useState([]);
  const [conflictZones, setConflictZones] = useState([]);
  const [historicalConflicts, setHistoricalConflicts] = useState([]);
  const [news, setNews] = useState([]);
  const [stats, setStats] = useState(null);
  const [fires, setFires] = useState([]);
  const [methane, setMethane] = useState(null);
  const [foodSecurity, setFoodSecurity] = useState(null);
  const [displacement, setDisplacement] = useState(null);
  const [dataSources, setDataSources] = useState([]);
  const [selectedHerd, setSelectedHerd] = useState(null);
  const [selectedConflictZone, setSelectedConflictZone] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [dataMethodology, setDataMethodology] = useState('');

  // Layer visibility state
  const [layers, setLayers] = useState({
    herds: true,
    water: true,
    ndvi: true,
    corridors: true,
    conflicts: true,
    fires: true,
  });

  // Simple mode toggle
  const [isSimpleMode, setIsSimpleMode] = useState(false);
  
  // Right panel active tab
  const [rightPanelTab, setRightPanelTab] = useState('ai');

  const toggleLayer = useCallback((layerId) => {
    setLayers(prev => ({ ...prev, [layerId]: !prev[layerId] }));
  }, []);

  const toggleSimpleMode = useCallback(() => {
    setIsSimpleMode(prev => !prev);
  }, []);

  // Safe select herd function with validation - also switches to HERD tab
  const selectHerd = useCallback((herd) => {
    if (herd && 
        herd.lat !== undefined && herd.lat !== null &&
        herd.lng !== undefined && herd.lng !== null &&
        typeof herd.lat === 'number' && typeof herd.lng === 'number' &&
        !isNaN(herd.lat) && !isNaN(herd.lng) &&
        herd.lat >= -90 && herd.lat <= 90 &&
        herd.lng >= -180 && herd.lng <= 180) {
      setSelectedHerd(herd);
      setSelectedConflictZone(null);
      setRightPanelTab('herd'); // Auto-switch to HERD tab
    } else {
      console.warn('Invalid herd coordinates:', herd);
    }
  }, []);

  // Safe select conflict zone function - also switches to ZONE tab
  const selectConflictZone = useCallback((zone) => {
    if (zone && 
        zone.lat !== undefined && zone.lat !== null &&
        zone.lng !== undefined && zone.lng !== null &&
        typeof zone.lat === 'number' && typeof zone.lng === 'number' &&
        !isNaN(zone.lat) && !isNaN(zone.lng) &&
        zone.lat >= -90 && zone.lat <= 90 &&
        zone.lng >= -180 && zone.lng <= 180) {
      setSelectedConflictZone(zone);
      setSelectedHerd(null);
      setRightPanelTab('conflict'); // Auto-switch to ZONE tab
    } else {
      console.warn('Invalid conflict zone coordinates:', zone);
    }
  }, []);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [
        herdsRes, 
        weatherRes, 
        weatherMultiRes,
        waterRes, 
        grazingRes, 
        corridorsRes, 
        ndviRes, 
        conflictRes,
        historicalRes,
        newsRes,
        statsRes,
        firesRes,
        methaneRes,
        foodSecurityRes,
        displacementRes,
        dataSourcesRes,
      ] = await Promise.all([
        axios.get(`${API}/herds`).catch(e => ({ data: { herds: [] } })),
        axios.get(`${API}/weather`).catch(e => ({ data: null })),
        axios.get(`${API}/weather/multi-location`).catch(e => ({ data: { locations: [] } })),
        axios.get(`${API}/water-sources`).catch(e => ({ data: { sources: [] } })),
        axios.get(`${API}/grazing-regions`).catch(e => ({ data: { regions: [] } })),
        axios.get(`${API}/corridors`).catch(e => ({ data: { corridors: [] } })),
        axios.get(`${API}/ndvi-zones`).catch(e => ({ data: { zones: [] } })),
        axios.get(`${API}/conflict-zones`).catch(e => ({ data: { zones: [] } })),
        axios.get(`${API}/historical-conflicts`).catch(e => ({ data: { conflicts: [] } })),
        axios.get(`${API}/news`).catch(e => ({ data: { articles: [] } })),
        axios.get(`${API}/stats`).catch(e => ({ data: null })),
        axios.get(`${API}/fires`).catch(e => ({ data: { fires: [] } })),
        axios.get(`${API}/methane`).catch(e => ({ data: null })),
        axios.get(`${API}/food-security`).catch(e => ({ data: null })),
        axios.get(`${API}/displacement`).catch(e => ({ data: null })),
        axios.get(`${API}/data-sources`).catch(e => ({ data: { sources: [] } })),
      ]);

      setHerds(herdsRes.data?.herds || []);
      setDataMethodology(herdsRes.data?.data_methodology || '');
      setWeather(weatherRes.data);
      setWeatherMulti(weatherMultiRes.data?.locations || []);
      setWaterSources(waterRes.data?.sources || []);
      setGrazingRegions(grazingRes.data?.regions || []);
      setCorridors(corridorsRes.data?.corridors || []);
      setNdviZones(ndviRes.data?.zones || []);
      setConflictZones(conflictRes.data?.zones || []);
      setHistoricalConflicts(historicalRes.data?.conflicts || []);
      setNews(newsRes.data?.articles || []);
      setStats(statsRes.data);
      setFires(firesRes.data?.fires || []);
      setMethane(methaneRes.data);
      setFoodSecurity(foodSecurityRes.data);
      setDisplacement(displacementRes.data);
      setDataSources(dataSourcesRes.data?.sources || []);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // AI Analysis
  const analyzeWithAI = useCallback(async (query, context = {}) => {
    try {
      const response = await axios.post(`${API}/ai/analyze`, {
        query,
        context: {
          ...context,
          selectedHerd: selectedHerd,
          selectedConflictZone: selectedConflictZone,
          weather: weather?.daily,
        }
      });
      return response.data;
    } catch (err) {
      console.error('AI analysis error:', err);
      throw new Error(err.response?.data?.detail || 'AI analysis failed');
    }
  }, [selectedHerd, selectedConflictZone, weather]);

  // Initial data load
  useEffect(() => {
    fetchAllData();
    
    // Refresh data every 5 minutes
    const interval = setInterval(fetchAllData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Apply simple mode class to body
  useEffect(() => {
    if (isSimpleMode) {
      document.body.classList.add('simple-mode');
    } else {
      document.body.classList.remove('simple-mode');
    }
  }, [isSimpleMode]);

  const value = {
    herds,
    weather,
    weatherMulti,
    waterSources,
    grazingRegions,
    corridors,
    ndviZones,
    conflictZones,
    historicalConflicts,
    news,
    stats,
    fires,
    methane,
    foodSecurity,
    displacement,
    dataSources,
    dataMethodology,
    selectedHerd,
    setSelectedHerd: selectHerd,
    selectedConflictZone,
    setSelectedConflictZone: selectConflictZone,
    layers,
    toggleLayer,
    isSimpleMode,
    toggleSimpleMode,
    isLoading,
    error,
    lastUpdated,
    fetchAllData,
    analyzeWithAI,
    rightPanelTab,
    setRightPanelTab,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
