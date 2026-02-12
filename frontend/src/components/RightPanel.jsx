import React, { useState, useCallback } from 'react';
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
  Crosshair,
  Satellite,
  Database,
  Flame,
  CloudRain,
  Wheat,
  Activity,
  Globe,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

// AI Quick Questions
const AI_PRESETS = [
  {
    icon: '⚠️',
    label: 'Predict next conflict hotspot',
    query: 'Based on current herd movements, water stress, and historical ACLED data, where is the most likely location for the next cattle-related conflict in the next 14 days?'
  },
  {
    icon: '🎯',
    label: 'Pibor corridor analysis',
    query: 'Analyze the Pibor-Murle corridor: which herds are converging, what is the conflict probability based on ACLED historical data, and what early warning indicators should UN monitors watch?'
  },
  {
    icon: '🌿',
    label: 'Grazing shortage + conflict link',
    query: 'Which herds face the most serious grazing shortage based on Sentinel-2 NDVI data, and how does this increase inter-ethnic conflict risk? Reference ACLED data for historical patterns.'
  },
  {
    icon: '💧',
    label: 'Water source pressure analysis',
    query: 'Which water sources from OSM data are under the most pressure from converging herds? What are the 2nd-order effects on community tensions?'
  },
  {
    icon: '🔥',
    label: 'Fire impact on movement',
    query: 'Are there any active fires from NASA FIRMS affecting cattle movement patterns? How might this trigger displacement or conflict?'
  },
];

// AI Analysis Tab
const AITab = () => {
  const { analyzeWithAI, selectedHerd, selectedConflictZone, dataSources } = useData();
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
          AI Analysis (Claude via Emergent LLM)
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
                Analyzing real data from ACLED, Open-Meteo, FAO, Sentinel-2...
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
                <div className="mt-2 text-[9px] text-primary">
                  Data sources: ACLED · FAO · Sentinel-2 · NASA FIRMS · Open-Meteo · ReliefWeb · IGAD
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

// Herd Detail Tab - FIXED
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
  const evidence = selectedHerd.evidence;
  const confidencePercent = evidence?.confidence ? (evidence.confidence * 100).toFixed(0) : 'N/A';

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
          <div className="mb-3">
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

          {/* Detection Confidence */}
          {evidence && (
            <div>
              <div className="flex justify-between font-mono text-[9px] text-muted-foreground mb-1">
                <span>DETECTION CONFIDENCE</span>
                <span className="text-success">{confidencePercent}%</span>
              </div>
              <div className="h-1.5 bg-card border border-border overflow-hidden">
                <div 
                  className="h-full transition-all duration-500 bg-success"
                  style={{ width: `${evidence.confidence * 100}%` }}
                />
              </div>
            </div>
          )}
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

        {/* Data Sources Used */}
        {selectedHerd.data_sources && (
          <div className="bg-accent/5 border border-accent/20 p-2.5">
            <div className="tactical-label mb-1 text-accent flex items-center gap-1">
              <Database className="h-3 w-3" />
              DATA SOURCES
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedHerd.data_sources.map((source, i) => (
                <Badge key={i} variant="outline" className="text-[8px] font-mono">
                  {source}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Evidence Section */}
        {evidence && (
          <div className="space-y-3">
            {/* Primary Indicators */}
            <div className="bg-success/5 border border-success/20 p-3">
              <div className="tactical-label mb-2 text-success flex items-center gap-2">
                <Satellite className="h-3 w-3" />
                PRIMARY DETECTION INDICATORS
              </div>
              <ul className="space-y-1.5">
                {evidence.primary_indicators?.map((indicator, i) => (
                  <li key={i} className="text-[10px] text-foreground leading-relaxed flex gap-2">
                    <span className="text-success">•</span>
                    {indicator}
                  </li>
                ))}
              </ul>
            </div>

            {/* Supporting Data */}
            <div className="bg-accent/5 border border-accent/20 p-3">
              <div className="tactical-label mb-2 text-accent flex items-center gap-2">
                <Database className="h-3 w-3" />
                SUPPORTING DATA SOURCES
              </div>
              <ul className="space-y-1.5">
                {evidence.supporting_data?.map((data, i) => (
                  <li key={i} className="text-[10px] text-foreground leading-relaxed flex gap-2">
                    <span className="text-accent">•</span>
                    {data}
                  </li>
                ))}
              </ul>
            </div>

            {/* Verification Info */}
            <div className="bg-muted border border-border p-2.5 space-y-1">
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Last Verified:</span>
                <span className="text-foreground font-mono">{evidence.last_verification}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Method:</span>
                <span className="text-foreground">{evidence.verification_method}</span>
              </div>
            </div>
          </div>
        )}
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
    return dist < 0.5;
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

          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className="font-mono text-[10px] font-bold"
              style={{ color, borderColor: `${color}50`, backgroundColor: `${color}10` }}
            >
              {zone.real_time_level || zone.risk_level} RISK
            </Badge>
            {zone.source && (
              <Badge variant="outline" className="font-mono text-[8px]">
                {zone.source}
              </Badge>
            )}
          </div>
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

        {/* ACLED Raw Events if available */}
        {zone.raw_events && zone.raw_events.length > 0 && (
          <div>
            <div className="tactical-label mb-2">ACLED VERIFIED EVENTS</div>
            <div className="space-y-1">
              {zone.raw_events.slice(0, 3).map((event, i) => (
                <div key={i} className="bg-destructive/5 border border-destructive/20 p-2 text-[10px]">
                  <div className="flex justify-between mb-1">
                    <span className="font-bold">{event.event_type}</span>
                    <span className="text-muted-foreground">{event.event_date}</span>
                  </div>
                  <div className="text-muted-foreground">
                    {event.location} · {event.fatalities} fatalities
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
                    {conflict.casualties} casualties · {formatNumber(conflict.cattle_stolen || 0)} cattle stolen
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

// Food Security Tab - NEW
const FoodSecurityTab = () => {
  const { foodSecurity, displacement, grazingRegions } = useData();

  const getPhaseColor = (phase) => {
    const colors = {
      1: 'text-success',
      2: 'text-warning',
      3: 'text-orange-500',
      4: 'text-destructive',
      5: 'text-destructive font-bold'
    };
    return colors[phase] || 'text-foreground';
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        <h3 className="font-display text-base font-bold tracking-wide flex items-center gap-2">
          <Wheat className="h-4 w-4 text-warning" />
          Food Security & Humanitarian
        </h3>
        
        {/* IPC Phase Overview */}
        {foodSecurity?.data?.current_phase && (
          <div className="bg-muted border border-border p-3">
            <div className="tactical-label mb-2 flex items-center gap-2">
              <AlertTriangle className="h-3 w-3 text-warning" />
              IPC CLASSIFICATION (FEWS NET)
            </div>
            <div className="text-sm font-bold text-warning mb-2">
              {foodSecurity.data.current_phase.overall}
            </div>
            <div className="space-y-1">
              {foodSecurity.data.current_phase.regions?.map((region, i) => (
                <div key={i} className="flex justify-between text-[10px] py-1 border-b border-border/30 last:border-0">
                  <span>{region.name}</span>
                  <span className={getPhaseColor(region.phase)}>
                    Phase {region.phase} - {region.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-border text-[10px] text-muted-foreground">
              Affected: {foodSecurity.data.affected_population}
            </div>
          </div>
        )}

        {/* Displacement Summary */}
        {displacement?.summary && (
          <div className="bg-muted border border-border p-3">
            <div className="tactical-label mb-2 flex items-center gap-2">
              <Users className="h-3 w-3 text-accent" />
              DISPLACEMENT (UNHCR/IOM)
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-lg font-bold text-primary">{displacement.summary.total_idps}</div>
                <div className="text-[9px] text-muted-foreground">Internal IDPs</div>
              </div>
              <div>
                <div className="text-lg font-bold text-accent">{displacement.summary.total_refugees}</div>
                <div className="text-[9px] text-muted-foreground">Refugees</div>
              </div>
            </div>
            <div className="mt-2 text-[9px] text-muted-foreground">
              {displacement.summary.note}
            </div>
          </div>
        )}

        {/* Grazing Conditions */}
        <div className="bg-muted border border-border p-3">
          <div className="tactical-label mb-2 flex items-center gap-2">
            <Satellite className="h-3 w-3 text-success" />
            GRAZING CONDITIONS (SENTINEL-2)
          </div>
          <div className="space-y-1">
            {grazingRegions.map((region, i) => (
              <div key={i} className="flex justify-between items-center text-[10px] py-1 border-b border-border/30 last:border-0">
                <span>{region.name}</span>
                <div className="flex items-center gap-2">
                  <span style={{ color: getNdviColor(region.ndvi) }}>
                    NDVI: {region.ndvi.toFixed(2)}
                  </span>
                  <Badge variant="outline" className={`text-[7px] ${
                    region.pressure === 'High' ? 'text-destructive border-destructive' :
                    region.pressure === 'Medium' ? 'text-warning border-warning' :
                    'text-success border-success'
                  }`}>
                    {region.pressure}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};

// Data Sources Tab - ENHANCED
const DataSourcesTab = () => {
  const { dataSources, fetchAllData, fires, weather } = useData();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAllData();
    setIsRefreshing(false);
  };

  const getStatusIcon = (status) => {
    if (status === 'connected') return <CheckCircle className="h-3 w-3 text-success" />;
    if (status === 'limited' || status === 'cached') return <Clock className="h-3 w-3 text-warning" />;
    return <XCircle className="h-3 w-3 text-destructive" />;
  };

  const getTypeColor = (type) => {
    const colors = {
      'LIVE': 'bg-success/10 text-success border-success/30',
      'CACHED': 'bg-warning/10 text-warning border-warning/30',
      'REFERENCE': 'bg-accent/10 text-accent border-accent/30',
      'DERIVED': 'bg-primary/10 text-primary border-primary/30',
      'STATIC': 'bg-muted text-muted-foreground border-border',
      'AI': 'bg-primary/10 text-primary border-primary/30',
      'LIMITED': 'bg-warning/10 text-warning border-warning/30',
    };
    return colors[type] || 'bg-muted text-foreground border-border';
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold tracking-wide flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Data Sources
          </h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="font-mono text-[9px]"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-success/5 border border-success/20 p-2 text-center">
            <div className="text-lg font-bold text-success">
              {dataSources.filter(s => s.status === 'connected').length}
            </div>
            <div className="text-[8px] text-muted-foreground">LIVE</div>
          </div>
          <div className="bg-warning/5 border border-warning/20 p-2 text-center">
            <div className="text-lg font-bold text-warning">
              {fires?.length || 0}
            </div>
            <div className="text-[8px] text-muted-foreground">FIRES</div>
          </div>
          <div className="bg-accent/5 border border-accent/20 p-2 text-center">
            <div className="text-lg font-bold text-accent">
              {weather?.status === 'live' ? '✓' : '—'}
            </div>
            <div className="text-[8px] text-muted-foreground">WEATHER</div>
          </div>
        </div>

        {/* Data Sources List */}
        <div className="space-y-2">
          {dataSources.map((source, i) => (
            <motion.div
              key={source.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-muted border border-border p-3"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(source.status)}
                  <span className="font-display text-sm font-bold">{source.name}</span>
                </div>
                <Badge variant="outline" className={`font-mono text-[7px] ${getTypeColor(source.type)}`}>
                  {source.type}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {source.description}
              </p>
              {source.url && (
                <a 
                  href={source.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[9px] text-primary hover:underline mt-1 block"
                >
                  {source.url}
                </a>
              )}
            </motion.div>
          ))}
        </div>

        {/* Methodology Note */}
        <div className="bg-primary/5 border border-primary/20 p-3">
          <div className="tactical-label mb-1 text-primary">DATA METHODOLOGY</div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Herd locations are evidence-based estimates derived from FAO livestock census, 
            Sentinel-2 NDVI, NASA FIRMS fire detection, historical IGAD migration patterns, 
            and ground reports from UNMISS, IOM, and WFP. No data is simulated.
          </p>
        </div>
      </div>
    </ScrollArea>
  );
};

// Main Right Panel Component
export const RightPanel = () => {
  const { rightPanelTab, setRightPanelTab } = useData();

  return (
    <div className="h-full flex flex-col bg-card border-l border-border overflow-hidden">
      <Tabs value={rightPanelTab} onValueChange={setRightPanelTab} className="flex-1 flex flex-col min-h-0">
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
            value="food"
            className="font-mono text-[8px] tracking-widest data-[state=active]:text-warning data-[state=active]:border-b-2 data-[state=active]:border-warning rounded-none"
          >
            FOOD
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
          <TabsContent value="food" className="h-full m-0 mt-0 data-[state=active]:h-full">
            <FoodSecurityTab />
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
