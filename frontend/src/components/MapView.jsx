import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'framer-motion';
import { useData } from '../context/DataContext';
import { getNdviColor, getNdviLabel, getWaterColor, formatNumber, getDirectionArrow, getConflictColor } from '../lib/dataUtils';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Map bounds for South Sudan
const SOUTH_SUDAN_CENTER = [7.5, 30.5];

// Custom herd marker component
const HerdMarker = ({ herd, isSelected, onClick }) => {
  // Validate herd coordinates - must have valid numbers
  const lat = parseFloat(herd?.lat);
  const lng = parseFloat(herd?.lng);
  
  if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
    console.warn('Invalid herd coordinates:', herd);
    return null;
  }

  const ndviColor = getNdviColor(herd.ndvi || 0);
  const markerClass = (herd.ndvi || 0) > 0.5 ? 'hm-green' : (herd.ndvi || 0) > 0.38 ? 'hm-gold' : 'hm-blue';
  
  const icon = L.divIcon({
    className: '',
    html: `
      <div class="herd-marker ${markerClass} ${isSelected ? 'selected' : ''}" 
           style="
             width: 32px; 
             height: 32px; 
             border-radius: 50%; 
             border: 2px solid ${ndviColor}; 
             background: ${ndviColor}30;
             display: flex; 
             align-items: center; 
             justify-content: center;
             font-size: 14px;
             cursor: pointer;
             transition: transform 0.2s, box-shadow 0.2s;
             box-shadow: ${isSelected ? `0 0 18px ${ndviColor}` : `0 2px 12px rgba(0,0,0,0.6)`};
             transform: ${isSelected ? 'scale(1.3)' : 'scale(1)'};
           ">
        🐄
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  const handleClick = () => {
    // Create a clean herd object with guaranteed valid coordinates
    const cleanHerd = {
      ...herd,
      lat: lat,
      lng: lng
    };
    onClick(cleanHerd);
  };

  return (
    <Marker 
      position={[lat, lng]} 
      icon={icon}
      eventHandlers={{ click: handleClick }}
    >
      <Popup>
        <div className="font-display text-base font-bold text-primary mb-2">
          🐄 {herd.name}
        </div>
        <div className="space-y-1 text-[10px]">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Region:</span>
            <span>{herd.region}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Cattle:</span>
            <span>~{formatNumber(herd.heads || 0)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Ethnicity:</span>
            <span>{herd.ethnicity}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Trend:</span>
            <span>{getDirectionArrow(herd.trend)} {herd.trend} · {herd.speed}km/day</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Water in:</span>
            <span>{herd.water_days} days</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">NDVI:</span>
            <span style={{ color: ndviColor }}>{(herd.ndvi || 0).toFixed(2)} — {getNdviLabel(herd.ndvi || 0)}</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-border text-[9px] text-muted-foreground">
          {herd.note}
        </div>
      </Popup>
    </Marker>
  );
};

// Conflict zone marker component
const ConflictZoneMarker = ({ zone, isSelected, onClick }) => {
  const color = getConflictColor(zone.real_time_level || zone.risk_level);
  const riskScore = zone.real_time_risk || zone.risk_score;
  
  // Validate zone coordinates - must have valid numbers
  const lat = parseFloat(zone?.lat);
  const lng = parseFloat(zone?.lng);
  
  if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
    console.warn('Invalid conflict zone coordinates:', zone);
    return null;
  }

  const handleClick = () => {
    // Create a clean zone object with guaranteed valid coordinates
    const cleanZone = {
      ...zone,
      lat: lat,
      lng: lng
    };
    onClick(cleanZone);
  };
  
  return (
    <>
      {/* Outer warning circle */}
      <Circle
        center={[lat, lng]}
        radius={zone.radius || 30000}
        pathOptions={{
          color: color,
          fillColor: color,
          fillOpacity: isSelected ? 0.25 : 0.15,
          weight: isSelected ? 3 : 2,
          dashArray: zone.real_time_level === 'Critical' ? '' : '5, 10',
        }}
        eventHandlers={{ click: handleClick }}
      >
        <Popup>
          <div className="font-display text-base font-bold mb-2" style={{ color }}>
            ⚠️ {zone.name}
          </div>
          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Risk Level:</span>
              <span style={{ color, fontWeight: 'bold' }}>{zone.real_time_level || zone.risk_level}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Risk Score:</span>
              <span style={{ color }}>{riskScore?.toFixed(0)}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Type:</span>
              <span>{zone.conflict_type}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Ethnicities:</span>
              <span>{zone.ethnicities_involved?.join(', ')}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Recent Incidents:</span>
              <span>{zone.recent_incidents}</span>
            </div>
            {zone.nearby_herds !== undefined && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Nearby Herds:</span>
                <span>{zone.nearby_herds}</span>
              </div>
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-border text-[9px] text-muted-foreground">
            {zone.description}
          </div>
        </Popup>
      </Circle>
      
      {/* Center marker for critical zones */}
      {(zone.real_time_level === 'Critical' || zone.real_time_level === 'High') && (
        <CircleMarker
          center={[lat, lng]}
          radius={8}
          pathOptions={{
            color: color,
            fillColor: color,
            fillOpacity: 1,
            weight: 2,
          }}
          eventHandlers={{ click: handleClick }}
        />
      )}
    </>
  );
};

// Water source marker component
const WaterMarker = ({ source }) => {
  const color = getWaterColor(source.reliability);
  
  return (
    <CircleMarker
      center={[source.lat, source.lng]}
      radius={6}
      pathOptions={{
        color: color,
        fillColor: color,
        fillOpacity: 0.8,
        weight: 2,
      }}
    >
      <Popup>
        <div className="font-display text-base font-bold text-accent mb-2">
          💧 {source.name}
        </div>
        <div className="space-y-1 text-[10px]">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Type:</span>
            <span>{source.type}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Reliability:</span>
            <span style={{ color }}>{Math.round(source.reliability * 100)}%</span>
          </div>
        </div>
      </Popup>
    </CircleMarker>
  );
};

// NDVI zone circle component
const NDVIZone = ({ zone }) => {
  const color = getNdviColor(zone.ndvi);
  
  return (
    <Circle
      center={[zone.lat, zone.lng]}
      radius={zone.radius}
      pathOptions={{
        color: color,
        fillColor: color,
        fillOpacity: 0.12,
        weight: 1,
      }}
    >
      <Popup>
        <div className="font-display text-base font-bold text-success mb-2">
          🌿 {zone.label}
        </div>
        <div className="space-y-1 text-[10px]">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">NDVI:</span>
            <span>{zone.ndvi.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Quality:</span>
            <span style={{ color }}>{getNdviLabel(zone.ndvi)}</span>
          </div>
        </div>
      </Popup>
    </Circle>
  );
};

// Corridor polyline component
const MigrationCorridor = ({ points }) => {
  return (
    <Polyline
      positions={points}
      pathOptions={{
        color: 'rgba(58, 159, 212, 0.5)',
        weight: 2.5,
        dashArray: '8, 12',
      }}
    />
  );
};

// Map controller for flying to selected location
const MapController = ({ selectedHerd, selectedConflictZone }) => {
  const map = useMap();
  const lastHerdRef = React.useRef(null);
  const lastZoneRef = React.useRef(null);
  
  useEffect(() => {
    // Only fly if we have a new valid herd selection
    if (selectedHerd && selectedHerd !== lastHerdRef.current) {
      const lat = parseFloat(selectedHerd.lat);
      const lng = parseFloat(selectedHerd.lng);
      
      if (!isNaN(lat) && !isNaN(lng) && 
          lat >= -90 && lat <= 90 && 
          lng >= -180 && lng <= 180 &&
          isFinite(lat) && isFinite(lng)) {
        lastHerdRef.current = selectedHerd;
        try {
          map.setView([lat, lng], 8, { animate: true, duration: 0.8 });
        } catch (e) {
          console.warn('Map setView error:', e);
        }
      }
    }
  }, [selectedHerd, map]);

  useEffect(() => {
    // Only fly if we have a new valid conflict zone selection
    if (selectedConflictZone && selectedConflictZone !== lastZoneRef.current) {
      const lat = parseFloat(selectedConflictZone.lat);
      const lng = parseFloat(selectedConflictZone.lng);
      
      if (!isNaN(lat) && !isNaN(lng) && 
          lat >= -90 && lat <= 90 && 
          lng >= -180 && lng <= 180 &&
          isFinite(lat) && isFinite(lng)) {
        lastZoneRef.current = selectedConflictZone;
        try {
          map.setView([lat, lng], 8, { animate: true, duration: 0.8 });
        } catch (e) {
          console.warn('Map setView error:', e);
        }
      }
    }
  }, [selectedConflictZone, map]);
  
  return null;
};

// Coordinates display component
const CoordinatesDisplay = () => {
  const [coords, setCoords] = React.useState({ lat: 7.0, lng: 30.0 });
  const map = useMap();
  
  useEffect(() => {
    const onMouseMove = (e) => {
      setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
    };
    map.on('mousemove', onMouseMove);
    return () => map.off('mousemove', onMouseMove);
  }, [map]);
  
  return (
    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-[500] pointer-events-none">
      <div className="font-mono text-[9px] text-muted-foreground/70 bg-background/80 px-3 py-1 tracking-wider">
        {coords.lat.toFixed(3)}°N  {coords.lng.toFixed(3)}°E — SOUTH SUDAN
      </div>
    </div>
  );
};

// Map legend component
const MapLegend = () => {
  const legendItems = [
    { color: 'hsl(152, 70%, 45%)', label: 'Good grazing' },
    { color: 'hsl(42, 82%, 53%)', label: 'Moderate grazing' },
    { color: 'hsl(15, 65%, 40%)', label: 'Dry / degraded' },
  ];

  const conflictItems = [
    { color: 'hsl(0, 85%, 50%)', label: 'Critical conflict zone' },
    { color: 'hsl(25, 95%, 53%)', label: 'High risk zone' },
    { color: 'hsl(42, 82%, 53%)', label: 'Medium risk zone' },
  ];
  
  return (
    <div className="absolute bottom-8 right-3 z-[500] bg-background/90 border border-border p-2 font-mono text-[9px]">
      <div className="mb-2 text-[8px] text-muted-foreground tracking-wider">GRAZING (NDVI)</div>
      {legendItems.map((item, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-foreground">{item.label}</span>
        </div>
      ))}
      <div className="my-2 border-t border-border pt-2 text-[8px] text-muted-foreground tracking-wider">CONFLICT (ACLED)</div>
      {conflictItems.map((item, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: item.color, background: `${item.color}30` }} />
          <span className="text-foreground">{item.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
        <div className="w-4 h-0.5 bg-accent rounded" />
        <span className="text-foreground">Migration corridor (IGAD)</span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
        <span className="text-foreground">Fire hotspot (FIRMS)</span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <div className="w-2.5 h-2.5 rounded-full bg-accent" />
        <span className="text-foreground">Water source (OSM)</span>
      </div>
    </div>
  );
};

// Fire marker component (NASA FIRMS)
const FireMarker = ({ fire }) => {
  if (!fire.lat || !fire.lng) return null;
  
  return (
    <CircleMarker
      center={[fire.lat, fire.lng]}
      radius={4}
      pathOptions={{
        color: '#ff4500',
        fillColor: '#ff6600',
        fillOpacity: 0.8,
        weight: 1,
      }}
    >
      <Popup>
        <div className="font-display text-sm font-bold text-orange-500 mb-2">
          🔥 Fire Hotspot
        </div>
        <div className="space-y-1 text-[10px]">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Date:</span>
            <span>{fire.acq_date || 'Recent'}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Confidence:</span>
            <span>{fire.confidence}</span>
          </div>
          {fire.brightness && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Brightness:</span>
              <span>{fire.brightness.toFixed(1)}K</span>
            </div>
          )}
        </div>
        <div className="mt-2 pt-2 border-t border-border text-[9px] text-muted-foreground">
          Source: NASA FIRMS VIIRS
        </div>
      </Popup>
    </CircleMarker>
  );
};

// Main Map Component
export const MapView = () => {
  const { 
    herds, 
    waterSources, 
    ndviZones, 
    corridors, 
    conflictZones,
    fires,
    selectedHerd, 
    setSelectedHerd, 
    selectedConflictZone,
    setSelectedConflictZone,
    layers, 
    isSimpleMode,
    lastUpdated,
    weather,
    stats
  } = useData();

  const [satelliteMode, setSatelliteMode] = React.useState(true);
  const [showWeatherOverlay, setShowWeatherOverlay] = React.useState(true);
  const [showRadarOverlay, setShowRadarOverlay] = React.useState(false);
  const [weatherLayer, setWeatherLayer] = React.useState('clouds'); // clouds, precipitation, temp
  
  // Tile layer based on mode
  const getTileUrl = () => {
    if (satelliteMode) {
      // ESRI World Imagery - High resolution satellite
      return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    }
    return isSimpleMode 
      ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  };

  const getTileAttribution = () => {
    if (satelliteMode) {
      return 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP';
    }
    return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
  };

  // Format last updated time
  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Loading...';
    const date = new Date(lastUpdated);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Get weather summary for overlay
  const getWeatherSummary = () => {
    if (!weather?.daily) return null;
    const rain7d = weather.daily.precipitation_sum?.slice(0, 7).reduce((a, b) => a + (b || 0), 0) || 0;
    const avgTemp = weather.daily.temperature_2m_max?.slice(0, 7).reduce((a, b) => a + (b || 0), 0) / 7 || 0;
    return { rain7d: rain7d.toFixed(1), avgTemp: avgTemp.toFixed(1) };
  };

  const weatherSummary = getWeatherSummary();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative w-full h-full"
    >
      <MapContainer
        center={SOUTH_SUDAN_CENTER}
        zoom={6}
        className="w-full h-full z-10"
        zoomControl={true}
        attributionControl={false}
        minZoom={5}
        maxZoom={18}
      >
        <TileLayer
          key={`${satelliteMode}-${isSimpleMode}`}
          url={getTileUrl()}
          maxZoom={18}
          subdomains={satelliteMode ? [] : ['a', 'b', 'c', 'd']}
          attribution={getTileAttribution()}
        />

        {/* Weather precipitation overlay - OpenWeatherMap */}
        {showWeatherOverlay && (
          <TileLayer
            url="https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2"
            opacity={0.5}
            maxZoom={18}
          />
        )}
        
        {/* Cloud cover overlay - OpenWeatherMap */}
        {showRadarOverlay && (
          <TileLayer
            url="https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2"
            opacity={0.6}
            maxZoom={18}
          />
        )}
        
        {/* Map controller */}
        <MapController selectedHerd={selectedHerd} selectedConflictZone={selectedConflictZone} />
        
        {/* NDVI Zones - hide on satellite mode for clarity */}
        {layers.ndvi && !satelliteMode && ndviZones.map((zone, i) => (
          <NDVIZone key={i} zone={zone} />
        ))}
        
        {/* Migration Corridors */}
        {layers.corridors && corridors.map((corridor, i) => (
          <MigrationCorridor key={i} points={corridor} />
        ))}

        {/* Conflict Zones */}
        {layers.conflicts && conflictZones.map((zone) => (
          <ConflictZoneMarker
            key={zone.id}
            zone={zone}
            isSelected={selectedConflictZone?.id === zone.id}
            onClick={setSelectedConflictZone}
          />
        ))}
        
        {/* Water Sources */}
        {layers.water && waterSources.map((source, i) => (
          <WaterMarker key={i} source={source} />
        ))}
        
        {/* Herds */}
        {layers.herds && herds.map((herd) => (
          <HerdMarker
            key={herd.id}
            herd={herd}
            isSelected={selectedHerd?.id === herd.id}
            onClick={setSelectedHerd}
          />
        ))}

        {/* Fire Hotspots (NASA FIRMS) */}
        {layers.fires && fires && fires.map((fire, i) => (
          <FireMarker key={`fire-${i}`} fire={fire} />
        ))}
        
        {/* Coordinates display */}
        <CoordinatesDisplay />
      </MapContainer>

      {/* Map controls - top left */}
      <div className="absolute top-3 left-3 z-[500] flex flex-col gap-2">
        <button
          onClick={() => setSatelliteMode(!satelliteMode)}
          className={`px-3 py-1.5 font-mono text-[9px] tracking-wider transition-colors ${
            satelliteMode 
              ? 'bg-accent text-accent-foreground' 
              : 'bg-card/90 text-muted-foreground hover:text-foreground'
          } border border-border`}
        >
          {satelliteMode ? '🛰️ SATELLITE' : '🗺️ MAP'}
        </button>
        <button
          onClick={() => setShowWeatherOverlay(!showWeatherOverlay)}
          className={`px-3 py-1.5 font-mono text-[9px] tracking-wider transition-colors ${
            showWeatherOverlay 
              ? 'bg-accent text-accent-foreground' 
              : 'bg-card/90 text-muted-foreground hover:text-foreground'
          } border border-border`}
        >
          {showWeatherOverlay ? '🌧️ PRECIP ON' : '🌧️ PRECIP OFF'}
        </button>
        <button
          onClick={() => setShowRadarOverlay(!showRadarOverlay)}
          className={`px-3 py-1.5 font-mono text-[9px] tracking-wider transition-colors ${
            showRadarOverlay 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-card/90 text-muted-foreground hover:text-foreground'
          } border border-border`}
        >
          {showRadarOverlay ? '☁️ CLOUDS ON' : '☁️ CLOUDS OFF'}
        </button>
        {fires && fires.length > 0 && (
          <div className="px-3 py-1.5 font-mono text-[9px] tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30 animate-pulse">
            🔥 {fires.length} FIRES LIVE
          </div>
        )}
      </div>

      {/* Weather overlay info */}
      {showWeatherOverlay && weatherSummary && (
        <div className="absolute top-3 left-[140px] z-[500] bg-card/90 border border-border px-3 py-1.5">
          <div className="font-mono text-[8px] text-muted-foreground tracking-wider">7-DAY WEATHER</div>
          <div className="font-mono text-[10px] flex items-center gap-3">
            <span className="text-accent">🌧️ {weatherSummary.rain7d}mm</span>
            <span className="text-warning">🌡️ {weatherSummary.avgTemp}°C</span>
          </div>
        </div>
      )}

      {/* Last Updated indicator */}
      <div className="absolute top-3 right-3 z-[500] bg-card/90 border border-border px-3 py-1.5">
        <div className="font-mono text-[8px] text-muted-foreground tracking-wider">LAST UPDATED</div>
        <div className="font-mono text-[10px] text-success flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-success pulse-live" />
          {formatLastUpdated()}
        </div>
      </div>
      
      {/* Legend */}
      <MapLegend />
    </motion.div>
  );
};

export default MapView;
