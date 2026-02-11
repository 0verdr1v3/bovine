import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import { getNdviColor, getNdviLabel, formatNumber, getDirectionArrow, getConflictColor } from '../lib/dataUtils';
import { ScrollArea } from './ui/scroll-area';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Droplets, MapPin, Users, TrendingUp, Layers, Navigation, Satellite, Wind, AlertTriangle, Shield, Newspaper, ExternalLink } from 'lucide-react';

// Weather Strip Component
const WeatherStrip = ({ weather }) => {
  if (!weather?.daily) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="shimmer w-full h-16 rounded" />
      </div>
    );
  }

  const { time, precipitation_sum, temperature_2m_max } = weather.daily;

  return (
    <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
      {time?.slice(0, 14).map((day, i) => {
        const rain = precipitation_sum?.[i] || 0;
        const temp = temperature_2m_max?.[i] || 0;
        const date = new Date(day);
        const dayLabel = date.toLocaleDateString('en', { weekday: 'short' }).slice(0, 2).toUpperCase();
        
        const rainColor = rain > 10 ? 'text-accent' : rain > 2 ? 'text-foreground' : 'text-muted-foreground';
        
        return (
          <motion.div
            key={day}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex-shrink-0 bg-muted border border-border px-2 py-1.5 text-center min-w-[44px] hover:border-border-bright transition-colors"
          >
            <div className="font-mono text-[7px] text-muted-foreground mb-1">{dayLabel}</div>
            <div className={`font-mono text-xs font-bold ${rainColor}`}>
              {rain.toFixed(0)}<span className="text-[7px]">mm</span>
            </div>
            <div className="font-mono text-[8px] text-muted-foreground mt-0.5">
              {Math.round(temp)}°C
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// Herd Card Component
const HerdCard = ({ herd, isSelected, onClick }) => {
  const ndviColor = getNdviColor(herd.ndvi);
  const ndviLabel = getNdviLabel(herd.ndvi);
  
  const variantClass = herd.ndvi > 0.5 ? 'border-success/30' : herd.ndvi > 0.38 ? 'border-primary/30' : 'border-accent/30';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`
        bg-muted border cursor-pointer transition-all duration-200 mb-1.5 overflow-hidden
        ${isSelected ? 'border-primary bg-primary/5 shadow-glow' : `${variantClass} hover:border-border-bright hover:bg-card`}
      `}
    >
      <div className="h-[3px] w-full" style={{ backgroundColor: ndviColor }} />
      
      <div className="p-2.5">
        <div className="flex justify-between items-start mb-1.5">
          <div className="font-display text-sm font-bold tracking-wide">{herd.name}</div>
          <Badge 
            variant="outline" 
            className="font-mono text-[7px] px-1.5 py-0 h-4"
            style={{ 
              color: ndviColor, 
              borderColor: `${ndviColor}50`,
              backgroundColor: `${ndviColor}10`
            }}
          >
            {ndviLabel}
          </Badge>
        </div>
        
        <div className="flex flex-wrap gap-x-2.5 gap-y-1 font-mono text-[9px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-2.5 w-2.5" />
            {formatNumber(herd.heads)}
          </span>
          <span className="flex items-center gap-1">
            <Navigation className="h-2.5 w-2.5" />
            {getDirectionArrow(herd.trend)} {herd.trend}
          </span>
          <span className="flex items-center gap-1">
            <Droplets className="h-2.5 w-2.5" />
            {herd.water_days}d
          </span>
          <span>{herd.ethnicity}</span>
        </div>
      </div>
    </motion.div>
  );
};

// Conflict Zone Card Component
const ConflictCard = ({ zone, isSelected, onClick }) => {
  const color = getConflictColor(zone.real_time_level || zone.risk_level);
  const riskScore = zone.real_time_risk || zone.risk_score;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`
        bg-muted border cursor-pointer transition-all duration-200 mb-1.5 overflow-hidden
        ${isSelected ? 'border-destructive bg-destructive/5 shadow-glow' : 'border-border hover:border-border-bright hover:bg-card'}
      `}
    >
      <div className="h-[3px] w-full" style={{ backgroundColor: color }} />
      
      <div className="p-2.5">
        <div className="flex justify-between items-start mb-1.5">
          <div className="font-display text-sm font-bold tracking-wide flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" style={{ color }} />
            {zone.name}
          </div>
          <Badge 
            variant="outline" 
            className="font-mono text-[7px] px-1.5 py-0 h-4 font-bold"
            style={{ 
              color: color, 
              borderColor: `${color}50`,
              backgroundColor: `${color}10`
            }}
          >
            {riskScore?.toFixed(0)}%
          </Badge>
        </div>
        
        <div className="flex flex-wrap gap-x-2.5 gap-y-1 font-mono text-[9px] text-muted-foreground">
          <span style={{ color }}>{zone.real_time_level || zone.risk_level}</span>
          <span>{zone.conflict_type}</span>
          <span>{zone.recent_incidents} incidents</span>
        </div>
        
        <div className="mt-1.5 text-[8px] text-muted-foreground">
          {zone.ethnicities_involved?.join(' · ')}
        </div>
      </div>
    </motion.div>
  );
};

// News Card Component
const NewsCard = ({ article }) => {
  const dateStr = article.published_at ? new Date(article.published_at).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '';
  
  return (
    <motion.a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="block bg-muted border border-border p-2.5 mb-1.5 hover:border-border-bright hover:bg-card transition-colors cursor-pointer"
    >
      <div className="flex justify-between items-start gap-2 mb-1">
        <div className="text-xs font-medium leading-tight line-clamp-2">{article.title}</div>
        <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
      </div>
      <div className="flex items-center gap-2 font-mono text-[8px] text-muted-foreground">
        <span>{article.source}</span>
        <span>·</span>
        <span>{dateStr}</span>
        {article.location && (
          <>
            <span>·</span>
            <span className="text-primary">{article.location}</span>
          </>
        )}
      </div>
    </motion.a>
  );
};

// Grazing Table Component
const GrazingTable = ({ regions }) => {
  const getPressureBadge = (pressure) => {
    const colors = {
      'Low': 'bg-success/10 text-success border-success/30',
      'Medium': 'bg-primary/10 text-primary border-primary/30',
      'High': 'bg-destructive/10 text-destructive border-destructive/30',
    };
    return colors[pressure] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-1">
      {regions.map((region, index) => (
        <motion.div
          key={region.name}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex items-center justify-between py-1.5 px-2 bg-muted/50 border border-border hover:bg-muted transition-colors"
        >
          <div>
            <div className="text-xs font-medium">{region.name}</div>
            <div className="font-mono text-[8px] text-muted-foreground">
              NDVI {region.ndvi.toFixed(2)} · {region.water}
            </div>
          </div>
          <Badge variant="outline" className={`font-mono text-[7px] ${getPressureBadge(region.pressure)}`}>
            {region.pressure}
          </Badge>
        </motion.div>
      ))}
    </div>
  );
};

// Layer Toggle Component
const LayerToggle = ({ id, name, description, enabled, onToggle }) => {
  return (
    <div 
      className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 transition-colors px-1 -mx-1"
      onClick={() => onToggle(id)}
    >
      <div>
        <div className="text-xs font-medium">{name}</div>
        <div className="font-mono text-[8px] text-muted-foreground">{description}</div>
      </div>
      <Switch 
        checked={enabled} 
        onCheckedChange={() => onToggle(id)}
        className="data-[state=checked]:bg-success"
      />
    </div>
  );
};

// Main LeftPanel Component
export const LeftPanel = () => {
  const { 
    herds, 
    weather, 
    grazingRegions, 
    conflictZones,
    news,
    selectedHerd, 
    setSelectedHerd,
    selectedConflictZone,
    setSelectedConflictZone, 
    layers, 
    toggleLayer, 
    isLoading 
  } = useData();

  const layerDefs = [
    { id: 'herds', name: 'Herd Positions', description: 'Tracked cattle groups' },
    { id: 'conflicts', name: 'Conflict Zones', description: 'Risk areas & predictions' },
    { id: 'ndvi', name: 'Vegetation Quality', description: 'NDVI grazing index overlay' },
    { id: 'water', name: 'Water Sources', description: 'Rivers, seasonal, permanent' },
    { id: 'corridors', name: 'Migration Corridors', description: 'Historical movement paths' },
  ];

  // Sort conflict zones by risk
  const sortedConflicts = [...conflictZones].sort((a, b) => 
    (b.real_time_risk || b.risk_score) - (a.real_time_risk || a.risk_score)
  );

  return (
    <div className="h-full flex flex-col bg-card border-r border-border overflow-hidden">
      <Tabs defaultValue="herds" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full grid grid-cols-3 h-9 rounded-none border-b border-border bg-transparent mx-3 mt-2" style={{ width: 'calc(100% - 24px)' }}>
          <TabsTrigger 
            value="herds" 
            className="font-mono text-[8px] tracking-widest data-[state=active]:text-primary data-[state=active]:border-b data-[state=active]:border-primary rounded-none"
          >
            HERDS
          </TabsTrigger>
          <TabsTrigger 
            value="conflicts"
            className="font-mono text-[8px] tracking-widest data-[state=active]:text-destructive data-[state=active]:border-b data-[state=active]:border-destructive rounded-none"
          >
            CONFLICTS
          </TabsTrigger>
          <TabsTrigger 
            value="news"
            className="font-mono text-[8px] tracking-widest data-[state=active]:text-accent data-[state=active]:border-b data-[state=active]:border-accent rounded-none"
          >
            NEWS
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="herds" className="m-0 p-3 space-y-4">
            {/* Tracked Herds */}
            <section>
              <div className="tactical-label mb-2 flex items-center gap-2">
                <Satellite className="h-3 w-3" />
                Tracked Herds ({herds.length})
              </div>
              <div className="space-y-1">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="shimmer h-16 rounded mb-1" />
                  ))
                ) : (
                  <AnimatePresence>
                    {herds.map((herd) => (
                      <HerdCard
                        key={herd.id}
                        herd={herd}
                        isSelected={selectedHerd?.id === herd.id}
                        onClick={() => setSelectedHerd(herd)}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </section>

            {/* Weather */}
            <section>
              <div className="tactical-label mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Wind className="h-3 w-3" />
                  14-Day Rainfall
                </span>
                <Badge variant="outline" className="text-[7px] text-success border-success/30 bg-success/10">
                  {weather?.status === 'live' ? 'LIVE' : 'CACHED'}
                </Badge>
              </div>
              <WeatherStrip weather={weather} />
            </section>

            {/* Grazing Regions */}
            <section>
              <div className="tactical-label mb-2 flex items-center gap-2">
                <TrendingUp className="h-3 w-3" />
                Grazing Quality
              </div>
              {isLoading ? (
                <div className="shimmer h-32 rounded" />
              ) : (
                <GrazingTable regions={grazingRegions} />
              )}
            </section>
          </TabsContent>

          <TabsContent value="conflicts" className="m-0 p-3 space-y-4">
            {/* Conflict Zones */}
            <section>
              <div className="tactical-label mb-2 flex items-center gap-2">
                <Shield className="h-3 w-3" />
                Conflict Zones ({conflictZones.length})
              </div>
              <div className="space-y-1">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="shimmer h-20 rounded mb-1" />
                  ))
                ) : (
                  <AnimatePresence>
                    {sortedConflicts.map((zone) => (
                      <ConflictCard
                        key={zone.id}
                        zone={zone}
                        isSelected={selectedConflictZone?.id === zone.id}
                        onClick={() => setSelectedConflictZone(zone)}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </section>

            {/* Risk Summary */}
            <section>
              <div className="tactical-label mb-2">Risk Summary</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-destructive/10 border border-destructive/30 p-2 text-center">
                  <div className="font-mono text-lg font-bold text-destructive">
                    {conflictZones.filter(z => z.real_time_level === 'Critical').length}
                  </div>
                  <div className="font-mono text-[8px] text-muted-foreground">CRITICAL</div>
                </div>
                <div className="bg-warning/10 border border-warning/30 p-2 text-center">
                  <div className="font-mono text-lg font-bold text-warning">
                    {conflictZones.filter(z => z.real_time_level === 'High').length}
                  </div>
                  <div className="font-mono text-[8px] text-muted-foreground">HIGH RISK</div>
                </div>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="news" className="m-0 p-3 space-y-4">
            {/* News Feed */}
            <section>
              <div className="tactical-label mb-2 flex items-center gap-2">
                <Newspaper className="h-3 w-3" />
                South Sudan News Feed
              </div>
              <div className="space-y-1">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="shimmer h-16 rounded mb-1" />
                  ))
                ) : news.length > 0 ? (
                  <AnimatePresence>
                    {news.map((article, i) => (
                      <NewsCard key={i} article={article} />
                    ))}
                  </AnimatePresence>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-xs">
                    No news articles available
                  </div>
                )}
              </div>
            </section>
          </TabsContent>
        </ScrollArea>

        {/* Map Layers - Always visible at bottom */}
        <div className="border-t border-border p-3">
          <div className="tactical-label mb-2 flex items-center gap-2">
            <Layers className="h-3 w-3" />
            Map Layers
          </div>
          <div className="space-y-0">
            {layerDefs.map((layer) => (
              <LayerToggle
                key={layer.id}
                {...layer}
                enabled={layers[layer.id]}
                onToggle={toggleLayer}
              />
            ))}
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default LeftPanel;
