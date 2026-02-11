import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'framer-motion';
import { useData } from '../context/DataContext';
import { getNdviColor, getNdviLabel, getWaterColor, formatNumber, getDirectionArrow } from '../lib/dataUtils';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Map bounds for South Sudan
const SOUTH_SUDAN_BOUNDS = [[3.5, 24], [12.5, 36]];
const SOUTH_SUDAN_CENTER = [7.5, 30.5];

// Custom herd marker component
const HerdMarker = ({ herd, isSelected, onClick }) => {
  const ndviColor = getNdviColor(herd.ndvi);
  const markerClass = herd.ndvi > 0.5 ? 'hm-green' : herd.ndvi > 0.38 ? 'hm-gold' : 'hm-blue';
  
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

  return (
    <Marker 
      position={[herd.lat, herd.lng]} 
      icon={icon}
      eventHandlers={{ click: onClick }}
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
            <span>~{formatNumber(herd.heads)}</span>
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
            <span style={{ color: ndviColor }}>{herd.ndvi.toFixed(2)} — {getNdviLabel(herd.ndvi)}</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-border text-[9px] text-muted-foreground">
          {herd.note}
        </div>
      </Popup>
    </Marker>
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

// Map controller for flying to selected herd
const MapController = ({ selectedHerd }) => {
  const map = useMap();
  
  useEffect(() => {
    if (selectedHerd) {
      map.flyTo([selectedHerd.lat, selectedHerd.lng], 8, { duration: 0.8 });
    }
  }, [selectedHerd, map]);
  
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
  
  return (
    <div className="absolute bottom-8 right-3 z-[500] bg-background/90 border border-border p-2 font-mono text-[9px]">
      {legendItems.map((item, i) => (
        <div key={i} className="flex items-center gap-2 mb-1 last:mb-0">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-foreground">{item.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
        <div className="w-4 h-0.5 bg-accent rounded" />
        <span className="text-foreground">Migration corridor</span>
      </div>
    </div>
  );
};

// Main Map Component
export const MapView = () => {
  const { herds, waterSources, ndviZones, corridors, selectedHerd, setSelectedHerd, layers, isSimpleMode } = useData();
  
  // Tile layer based on mode
  const tileUrl = isSimpleMode 
    ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

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
        maxBounds={SOUTH_SUDAN_BOUNDS}
        minZoom={5}
        maxZoom={12}
      >
        <TileLayer
          url={tileUrl}
          maxZoom={18}
          subdomains="abcd"
        />
        
        {/* Map controller */}
        <MapController selectedHerd={selectedHerd} />
        
        {/* NDVI Zones */}
        {layers.ndvi && ndviZones.map((zone, i) => (
          <NDVIZone key={i} zone={zone} />
        ))}
        
        {/* Migration Corridors */}
        {layers.corridors && corridors.map((corridor, i) => (
          <MigrationCorridor key={i} points={corridor} />
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
            onClick={() => setSelectedHerd(herd)}
          />
        ))}
        
        {/* Coordinates display */}
        <CoordinatesDisplay />
      </MapContainer>
      
      {/* Legend */}
      <MapLegend />
    </motion.div>
  );
};

export default MapView;
