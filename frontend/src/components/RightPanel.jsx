import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import { getNdviColor, getNdviLabel, formatNumber, getDirectionArrow, calculatePressureScore, getConflictColor } from '../lib/dataUtils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Textarea } from './ui/textarea';
import { 
  BrainCircuit, 
  Send, 
  Sparkles, 
  Target, 
  TrendingUp, 
  Droplets, 
  AlertTriangle,
  Loader2,
  RefreshCw,
  Shield,
  Users,
  Calendar,
  MapPin,
  Crosshair
} from 'lucide-react';

// AI Quick Questions - Updated with conflict focus
const AI_PRESETS = [
  {
    icon: '⚠️',
    label: 'Predict next conflict hotspot',
    query: 'Based on current herd movements, water stress, and historical patterns, where is the most likely location for the next cattle-related conflict in the next 14 days?'
  },
  {
    icon: '🎯',
    label: 'Pibor corridor analysis',
    query: 'Analyze the Pibor-Murle corridor: which herds are converging, what is the conflict probability, and what early warning indicators should UN monitors watch?'
  },
  {
    icon: '🌿',
    label: 'Grazing shortage + conflict link',
    query: 'Which herds face the most serious grazing shortage, and how does this increase inter-ethnic conflict risk? Quantify the displacement probability.'
  },
  {
    icon: '💧',
    label: 'Water source pressure analysis',
    query: 'Which water sources are under the most pressure from converging herds? What are the 2nd-order effects on community tensions?'
  },
  {
    icon: '🧭',
    label: 'Movement + violence prediction',
    query: 'Model likely herd movements over the next 7-14 days. Where do ethnic territories overlap with predicted movement paths? What violence risk does this create?'
  },
];

// AI Analysis Tab
const AITab = () => {
  const { analyzeWithAI, selectedHerd, selectedConflictZone } = useData();
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAnalyze = useCallback(async (customQuery) => {
    const queryToUse = customQuery || query;
    if (!queryToUse.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setResponse('');
    
    try {
      const result = await analyzeWithAI(queryToUse);
      setResponse(result.response);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [query, analyzeWithAI]);

  const handlePresetClick = (preset) => {
    setQuery(preset.query);
    handleAnalyze(preset.query);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAnalyze();
    }
  };

  return (
    <div className="flex flex-col h-full p-3">
      {/* Context indicator */}
      {(selectedHerd || selectedConflictZone) && (
        <div className="mb-3 p-2 bg-primary/5 border border-primary/20 text-[10px] font-mono">
          <span className="text-muted-foreground">CONTEXT: </span>
          {selectedHerd && <span className="text-primary">{selectedHerd.name}</span>}
          {selectedConflictZone && <span className="text-destructive">{selectedConflictZone.name}</span>}
        </div>
      )}

      {/* Quick Questions */}
      <div className="mb-3">
        <div className="tactical-label mb-2 flex items-center gap-2">
          <Sparkles className="h-3 w-3" />
          AI Analysis
        </div>
        <div className="space-y-1">
          {AI_PRESETS.map((preset, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => handlePresetClick(preset)}
              disabled={isLoading}
              className="w-full text-left font-mono text-[10px] px-2.5 py-2 bg-muted border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="mr-2">{preset.icon}</span>
              {preset.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Custom Query Input */}
      <div className="mb-3">
        <div className="flex gap-2">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about conflicts, cattle movement, predictions..."
            className="flex-1 min-h-[60px] font-mono text-[11px] bg-muted border-border resize-none"
            disabled={isLoading}
          />
        </div>
        <div className="flex justify-end mt-2">
          <Button
            onClick={() => handleAnalyze()}
            disabled={isLoading || !query.trim()}
            size="sm"
            className="font-display font-bold tracking-wider"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-3.5 w-3.5 mr-1" />
                RUN
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Response Area */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="font-mono text-[11px] leading-relaxed bg-muted border border-border p-3 min-h-[150px]">
            {isLoading ? (
              <div className="ai-thinking text-muted-foreground">
                Analyzing intelligence data...
              </div>
            ) : error ? (
              <div className="text-destructive">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                {error}
              </div>
            ) : response ? (
              <div className="text-success/90 whitespace-pre-wrap">{response}</div>
            ) : (
              <div className="text-muted-foreground">
                Select a herd or conflict zone for context, then ask about predictions, risks, or movements.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

// Herd Detail Tab
const HerdDetailTab = () => {
  const { selectedHerd } = useData();

  if (!selectedHerd) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <Target className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="font-mono text-xs text-muted-foreground">
          Click a herd on the map<br />or list to see details
        </p>
      </div>
    );
  }

  const ndviColor = getNdviColor(selectedHerd.ndvi);
  const waterColor = selectedHerd.water_days <= 2 ? 'hsl(42, 82%, 53%)' : 
                     selectedHerd.water_days <= 5 ? 'hsl(var(--foreground))' : 'hsl(152, 65%, 45%)';
  const pressureScore = calculatePressureScore(selectedHerd);

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-muted border border-border p-3"
          style={{ borderTopWidth: 3, borderTopColor: ndviColor }}
        >
          <h3 className="font-display text-lg font-bold tracking-wide mb-3">
            🐄 {selectedHerd.name}
          </h3>
          
          {/* NDVI Progress */}
          <div className="mb-3">
            <div className="flex justify-between font-mono text-[9px] text-muted-foreground mb-1">
              <span>NDVI — {getNdviLabel(selectedHerd.ndvi)}</span>
              <span>{selectedHerd.ndvi.toFixed(2)}</span>
            </div>
            <div className="h-1.5 bg-card border border-border overflow-hidden">
              <div 
                className="h-full transition-all duration-500"
                style={{ width: `${selectedHerd.ndvi * 100}%`, backgroundColor: ndviColor }}
              />
            </div>
          </div>
          
          {/* Water Progress */}
          <div>
            <div className="flex justify-between font-mono text-[9px] text-muted-foreground mb-1">
              <span>WATER ACCESS URGENCY</span>
              <span>{selectedHerd.water_days} days</span>
            </div>
            <div className="h-1.5 bg-card border border-border overflow-hidden">
              <div 
                className="h-full transition-all duration-500"
                style={{ 
                  width: `${Math.min(100, (8 - selectedHerd.water_days) / 7 * 100)}%`, 
                  backgroundColor: waterColor 
                }}
              />
            </div>
          </div>
        </motion.div>

        {/* Details Table */}
        <div className="space-y-0">
          {[
            { label: 'REGION', value: selectedHerd.region },
            { label: 'CATTLE', value: `~${formatNumber(selectedHerd.heads)} head` },
            { label: 'ETHNICITY', value: selectedHerd.ethnicity },
            { label: 'DIRECTION', value: `${getDirectionArrow(selectedHerd.trend)} ${selectedHerd.trend}` },
            { label: 'SPEED', value: `${selectedHerd.speed} km/day` },
            { label: 'WATER IN', value: `${selectedHerd.water_days} day${selectedHerd.water_days !== 1 ? 's' : ''}`, color: waterColor },
            { label: 'LOCAL NDVI', value: `${selectedHerd.ndvi.toFixed(2)} — ${getNdviLabel(selectedHerd.ndvi)}`, color: ndviColor },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex justify-between py-2 px-2 border-b border-border/50 last:border-0"
            >
              <span className="font-mono text-[8px] text-muted-foreground tracking-wider">{item.label}</span>
              <span className="text-[11px]" style={item.color ? { color: item.color } : {}}>
                {item.value}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Note */}
        <div 
          className="text-[11px] text-muted-foreground leading-relaxed bg-muted border border-border p-2.5"
          style={{ borderLeftWidth: 2, borderLeftColor: ndviColor }}
        >
          {selectedHerd.note}
        </div>
      </div>
    </ScrollArea>
  );
};

// Conflict Zone Detail Tab
const ConflictDetailTab = () => {
  const { selectedConflictZone, historicalConflicts } = useData();

  if (!selectedConflictZone) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <Shield className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="font-mono text-xs text-muted-foreground">
          Click a conflict zone on the map<br />or list to see details
        </p>
      </div>
    );
  }

  const zone = selectedConflictZone;
  const color = getConflictColor(zone.real_time_level || zone.risk_level);
  const riskScore = zone.real_time_risk || zone.risk_score;

  // Find related historical conflicts
  const relatedConflicts = historicalConflicts.filter(c => {
    const dist = Math.sqrt(Math.pow(c.lat - zone.lat, 2) + Math.pow(c.lng - zone.lng, 2));
    return dist < 0.5; // Within ~50km
  });

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-muted border border-border p-3"
          style={{ borderTopWidth: 3, borderTopColor: color }}
        >
          <h3 className="font-display text-lg font-bold tracking-wide mb-2 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" style={{ color }} />
            {zone.name}
          </h3>
          
          {/* Risk Score */}
          <div className="mb-3">
            <div className="flex justify-between font-mono text-[9px] text-muted-foreground mb-1">
              <span>REAL-TIME RISK SCORE</span>
              <span style={{ color }}>{riskScore?.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-card border border-border overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${riskScore}%` }}
                transition={{ duration: 0.5 }}
                className="h-full"
                style={{ backgroundColor: color }}
              />
            </div>
          </div>

          <Badge 
            variant="outline" 
            className="font-mono text-[10px] font-bold"
            style={{ color, borderColor: `${color}50`, backgroundColor: `${color}10` }}
          >
            {zone.real_time_level || zone.risk_level} RISK
          </Badge>
        </motion.div>

        {/* Risk Factors */}
        {zone.factors && (
          <div className="bg-muted border border-border p-3">
            <div className="tactical-label mb-2">RISK FACTORS</div>
            <div className="space-y-2">
              {Object.entries(zone.factors).map(([key, value]) => (
                <div key={key}>
                  <div className="flex justify-between font-mono text-[9px] text-muted-foreground mb-1">
                    <span>{key.replace(/_/g, ' ').toUpperCase()}</span>
                    <span>{(value * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1 bg-card border border-border overflow-hidden">
                    <div 
                      className="h-full bg-primary"
                      style={{ width: `${value * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Details */}
        <div className="space-y-0">
          {[
            { label: 'CONFLICT TYPE', value: zone.conflict_type, icon: Crosshair },
            { label: 'ETHNICITIES', value: zone.ethnicities_involved?.join(', '), icon: Users },
            { label: 'RECENT INCIDENTS', value: zone.recent_incidents, icon: AlertTriangle },
            { label: 'LAST INCIDENT', value: zone.last_incident_date || 'Unknown', icon: Calendar },
            { label: 'NEARBY HERDS', value: zone.nearby_herds !== undefined ? zone.nearby_herds : 'N/A', icon: MapPin },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex justify-between py-2 px-2 border-b border-border/50 last:border-0"
            >
              <span className="font-mono text-[8px] text-muted-foreground tracking-wider flex items-center gap-1">
                <item.icon className="h-3 w-3" />
                {item.label}
              </span>
              <span className="text-[11px]">{item.value}</span>
            </motion.div>
          ))}
        </div>

        {/* Description */}
        <div 
          className="text-[11px] text-muted-foreground leading-relaxed bg-muted border border-border p-2.5"
          style={{ borderLeftWidth: 2, borderLeftColor: color }}
        >
          {zone.description}
        </div>

        {/* Historical Conflicts */}
        {relatedConflicts.length > 0 && (
          <div>
            <div className="tactical-label mb-2">HISTORICAL INCIDENTS</div>
            <div className="space-y-1">
              {relatedConflicts.slice(0, 5).map((conflict, i) => (
                <div key={i} className="bg-destructive/5 border border-destructive/20 p-2 text-[10px]">
                  <div className="flex justify-between mb-1">
                    <span className="font-bold">{conflict.type}</span>
                    <span className="text-muted-foreground">{conflict.date}</span>
                  </div>
                  <div className="text-muted-foreground">
                    {conflict.casualties} casualties · {formatNumber(conflict.cattle_stolen)} cattle stolen
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

// Forecast Tab
const ForecastTab = () => {
  const { herds, weather, conflictZones } = useData();

  const rain14d = weather?.daily?.precipitation_sum?.reduce((a, b) => a + (b || 0), 0) || 0;
  const dryDays = weather?.daily?.precipitation_sum?.filter(r => (r || 0) < 1).length || 0;
  const avgNdvi = herds.length ? herds.reduce((s, h) => s + h.ndvi, 0) / herds.length : 0;
  const lowWaterHerds = herds.filter(h => h.water_days <= 3).length;
  const criticalZones = conflictZones.filter(z => z.real_time_level === 'Critical').length;
  const highRiskZones = conflictZones.filter(z => z.real_time_level === 'High').length;

  const forecastInputs = [
    { label: '14-day total rainfall', value: `${rain14d.toFixed(1)}mm`, color: rain14d > 50 ? 'text-accent' : rain14d > 20 ? 'text-foreground' : 'text-warning' },
    { label: 'Dry days in forecast', value: `${dryDays} of 14`, color: dryDays > 10 ? 'text-warning' : 'text-success' },
    { label: 'Average NDVI (region)', value: avgNdvi.toFixed(2), color: avgNdvi < 0.4 ? 'text-warning' : 'text-success' },
    { label: 'Herds with <3 days water', value: lowWaterHerds, color: lowWaterHerds > 3 ? 'text-destructive' : 'text-warning' },
    { label: 'Critical conflict zones', value: criticalZones, color: criticalZones > 0 ? 'text-destructive' : 'text-success' },
    { label: 'High risk zones', value: highRiskZones, color: highRiskZones > 2 ? 'text-warning' : 'text-foreground' },
  ];

  // Calculate pressure scores
  const pressures = herds.map(h => ({
    ...h,
    score: calculatePressureScore(h)
  })).sort((a, b) => b.score - a.score);

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        <h3 className="font-display text-base font-bold tracking-wide">Predictive Model</h3>
        
        {/* Forecast Inputs */}
        <div>
          <div className="tactical-label mb-2">LIVE INPUT DATA</div>
          <div className="space-y-0">
            {forecastInputs.map((input, i) => (
              <motion.div
                key={input.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex justify-between py-1.5 border-b border-border font-mono text-[10px]"
              >
                <span className="text-muted-foreground">{input.label}</span>
                <span className={`font-bold ${input.color}`}>{input.value}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Movement Pressures */}
        <div>
          <div className="tactical-label mb-2">MOVEMENT PRESSURE INDEX</div>
          <div className="space-y-2">
            {pressures.slice(0, 5).map((herd, i) => {
              const color = herd.score > 65 ? 'hsl(42, 82%, 53%)' : herd.score > 40 ? 'hsl(var(--foreground))' : 'hsl(152, 65%, 45%)';
              return (
                <motion.div
                  key={herd.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="flex justify-between font-mono text-[9px] text-muted-foreground mb-1">
                    <span>{herd.name} · {herd.trend}</span>
                    <span style={{ color }}>{herd.score}%</span>
                  </div>
                  <div className="h-1.5 bg-card border border-border overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${herd.score}%` }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className="h-full"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Model Info */}
        <div className="font-mono text-[9px] text-muted-foreground leading-relaxed border-t border-border pt-3 mt-3">
          <p className="mb-2 text-primary">PREDICTION MODEL INPUTS:</p>
          <ul className="space-y-0.5">
            <li>· Open-Meteo precipitation (LIVE)</li>
            <li>· NDVI vegetation index</li>
            <li>· Historical conflict patterns</li>
            <li>· Ethnic territory boundaries</li>
            <li>· Water source proximity</li>
            <li>· Herd convergence analysis</li>
          </ul>
        </div>
      </div>
    </ScrollArea>
  );
};

// Data Sources Tab
const DataSourcesTab = () => {
  const { weather, fetchAllData } = useData();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const dataSources = [
    {
      name: 'Open-Meteo Weather',
      status: weather?.status === 'live' ? 'connected' : 'cached',
      description: 'Real-time 14-day rainfall & temperature forecast.',
      tag: 'LIVE',
      tagClass: 'bg-success/10 text-success border-success/30',
    },
    {
      name: 'Conflict Zone Database',
      status: 'connected',
      description: '8 monitored zones with real-time risk calculation.',
      tag: 'LIVE',
      tagClass: 'bg-success/10 text-success border-success/30',
    },
    {
      name: 'Historical Conflicts',
      status: 'connected',
      description: 'Backtested conflict data from 2024.',
      tag: 'DATABASE',
      tagClass: 'bg-accent/10 text-accent border-accent/30',
    },
    {
      name: 'Claude AI Analysis',
      status: 'connected',
      description: 'AI-powered conflict & movement predictions.',
      tag: 'EMERGENT LLM',
      tagClass: 'bg-primary/10 text-primary border-primary/30',
    },
    {
      name: 'News Feed',
      status: 'connected',
      description: 'Curated South Sudan cattle & conflict news.',
      tag: 'CURATED',
      tagClass: 'bg-warning/10 text-warning border-warning/30',
    },
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAllData();
    setIsRefreshing(false);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold tracking-wide">Data Sources</h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="font-mono text-[9px]"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="space-y-2">
          {dataSources.map((source, i) => (
            <motion.div
              key={source.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-muted border border-border p-3"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    source.status === 'connected' ? 'bg-success pulse-live' :
                    source.status === 'cached' ? 'bg-warning' :
                    'bg-muted-foreground'
                  }`} />
                  <span className="font-display text-sm font-bold">{source.name}</span>
                </div>
                <Badge variant="outline" className={`font-mono text-[7px] ${source.tagClass}`}>
                  {source.tag}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {source.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
};

// Main Right Panel Component
export const RightPanel = () => {
  return (
    <div className="h-full flex flex-col bg-card border-l border-border overflow-hidden">
      <Tabs defaultValue="ai" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full grid grid-cols-5 h-10 rounded-none border-b border-border bg-transparent">
          <TabsTrigger 
            value="ai" 
            className="font-mono text-[8px] tracking-widest data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            AI
          </TabsTrigger>
          <TabsTrigger 
            value="herd"
            className="font-mono text-[8px] tracking-widest data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            HERD
          </TabsTrigger>
          <TabsTrigger 
            value="conflict"
            className="font-mono text-[8px] tracking-widest data-[state=active]:text-destructive data-[state=active]:border-b-2 data-[state=active]:border-destructive rounded-none"
          >
            ZONE
          </TabsTrigger>
          <TabsTrigger 
            value="forecast"
            className="font-mono text-[8px] tracking-widest data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            MODEL
          </TabsTrigger>
          <TabsTrigger 
            value="data"
            className="font-mono text-[8px] tracking-widest data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            DATA
          </TabsTrigger>
        </TabsList>
        
        <div className="flex-1 min-h-0 overflow-hidden">
          <TabsContent value="ai" className="h-full m-0 mt-0 data-[state=active]:h-full">
            <AITab />
          </TabsContent>
          <TabsContent value="herd" className="h-full m-0 mt-0 data-[state=active]:h-full">
            <HerdDetailTab />
          </TabsContent>
          <TabsContent value="conflict" className="h-full m-0 mt-0 data-[state=active]:h-full">
            <ConflictDetailTab />
          </TabsContent>
          <TabsContent value="forecast" className="h-full m-0 mt-0 data-[state=active]:h-full">
            <ForecastTab />
          </TabsContent>
          <TabsContent value="data" className="h-full m-0 mt-0 data-[state=active]:h-full">
            <DataSourcesTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default RightPanel;
