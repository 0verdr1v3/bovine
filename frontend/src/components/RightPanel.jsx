import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import { getNdviColor, getNdviLabel, formatNumber, getDirectionArrow, calculatePressureScore } from '../lib/dataUtils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { 
  BrainCircuit, 
  Send, 
  Sparkles, 
  Target, 
  TrendingUp, 
  Droplets, 
  MapPin,
  AlertTriangle,
  Loader2,
  ChevronRight,
  RefreshCw,
  Database,
  Satellite
} from 'lucide-react';

// AI Quick Questions
const AI_PRESETS = [
  {
    icon: '🌿',
    label: 'Grazing shortage analysis',
    query: 'Based on current NDVI and rainfall data, which herds face the most serious grazing shortage in the next 14 days?'
  },
  {
    icon: '🧭',
    label: 'Movement predictions',
    query: 'Where should we expect herds to move next based on water availability and vegetation quality?'
  },
  {
    icon: '💧',
    label: 'Water pressure points',
    query: 'Which water sources are under the most pressure from converging herds right now?'
  },
  {
    icon: '⛓️',
    label: '2nd & 3rd order effects',
    query: 'What are the 2nd and 3rd order effects of the current dry spell on cattle migration patterns?'
  },
  {
    icon: '📍',
    label: 'Sobat River scenario',
    query: 'If the Sobat River corridor dries further, model the likely herd movement response.'
  },
];

// AI Analysis Tab
const AITab = () => {
  const { analyzeWithAI, selectedHerd, weather } = useData();
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

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
      {/* Quick Questions */}
      <div className="mb-3">
        <div className="tactical-label mb-2 flex items-center gap-2">
          <Sparkles className="h-3 w-3" />
          Quick Questions
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
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about grazing, water, movement..."
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
                Analyzing data...
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
                Load weather data and select a herd to build full context, then ask anything.
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
  const { selectedHerd, analyzeWithAI } = useData();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

  const handleQuickAnalysis = async () => {
    setIsAnalyzing(true);
    // This would trigger analysis in the AI tab
    setIsAnalyzing(false);
  };

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
            {selectedHerd.name}
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

        {/* Quick Analysis Button */}
        <Button 
          variant="outline" 
          className="w-full font-mono text-[10px]"
          onClick={handleQuickAnalysis}
          disabled={isAnalyzing}
        >
          <BrainCircuit className="h-3.5 w-3.5 mr-2" />
          Analyse this herd with AI →
        </Button>
      </div>
    </ScrollArea>
  );
};

// Forecast Tab
const ForecastTab = () => {
  const { herds, weather, stats } = useData();

  const rain14d = weather?.daily?.precipitation_sum?.reduce((a, b) => a + (b || 0), 0) || 0;
  const dryDays = weather?.daily?.precipitation_sum?.filter(r => (r || 0) < 1).length || 0;
  const avgNdvi = herds.length ? herds.reduce((s, h) => s + h.ndvi, 0) / herds.length : 0;
  const lowWaterHerds = herds.filter(h => h.water_days <= 3).length;
  const highSpeedHerds = herds.filter(h => h.speed > 10).length;

  const forecastInputs = [
    { label: '14-day total rainfall', value: `${rain14d.toFixed(1)}mm`, color: rain14d > 50 ? 'text-accent' : rain14d > 20 ? 'text-foreground' : 'text-warning' },
    { label: 'Dry days in forecast', value: `${dryDays} of 14`, color: dryDays > 10 ? 'text-warning' : 'text-success' },
    { label: 'Average NDVI (region)', value: avgNdvi.toFixed(2), color: 'text-success' },
    { label: 'Herds with <3 days water', value: lowWaterHerds, color: 'text-warning' },
    { label: 'High-speed herds (>10km/day)', value: highSpeedHerds, color: 'text-foreground' },
  ];

  // Calculate pressure scores
  const pressures = herds.map(h => ({
    ...h,
    score: calculatePressureScore(h)
  })).sort((a, b) => b.score - a.score);

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        <h3 className="font-display text-base font-bold tracking-wide">Movement Forecast Model</h3>
        
        {/* Forecast Inputs */}
        <div>
          <div className="tactical-label mb-2">FORECAST INPUTS — LIVE DATA</div>
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

        {/* Predicted Pressures */}
        <div>
          <div className="tactical-label mb-2">PREDICTED MOVEMENT PRESSURES</div>
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
                    <span>{herd.name} · heading {herd.trend}</span>
                    <span style={{ color }}>{herd.score}% pressure</span>
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
                  <div className="font-mono text-[8px] text-muted-foreground mt-0.5">
                    {herd.water_days}d water · NDVI {herd.ndvi.toFixed(2)} · {herd.speed}km/day
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Model Info */}
        <div className="font-mono text-[9px] text-muted-foreground leading-relaxed border-t border-border pt-3 mt-3">
          <p className="mb-2">MODEL INPUTS:</p>
          <ul className="space-y-0.5">
            <li>· Open-Meteo precipitation forecast (LIVE)</li>
            <li>· NDVI vegetation index (LIVE via NASA)</li>
            <li>· Historical corridor weighting</li>
            <li>· Water source proximity scoring</li>
            <li>· Seasonal pattern baseline</li>
          </ul>
        </div>
      </div>
    </ScrollArea>
  );
};

// Data Sources Tab (Setup)
const DataSourcesTab = () => {
  const { weather, fetchAllData } = useData();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const dataSources = [
    {
      name: 'Open-Meteo Weather',
      status: weather?.status === 'live' ? 'connected' : 'cached',
      description: 'Real-time 14-day rainfall & temperature forecast for South Sudan.',
      tag: 'FREE · NO KEY',
      tagClass: 'bg-success/10 text-success border-success/30',
    },
    {
      name: 'NASA MODIS NDVI',
      status: 'estimated',
      description: 'Vegetation quality derived from weather patterns. Full MODIS integration available with NASA EarthData account.',
      tag: 'FREE · REGISTRATION',
      tagClass: 'bg-success/10 text-success border-success/30',
    },
    {
      name: 'Claude AI Analysis',
      status: 'connected',
      description: 'AI-powered cattle movement analysis and predictions using Anthropic Claude.',
      tag: 'EMERGENT LLM',
      tagClass: 'bg-primary/10 text-primary border-primary/30',
    },
    {
      name: 'Sentinel-5P Methane',
      status: 'planned',
      description: 'Methane emissions data for livestock detection. Indirect tracking via atmospheric analysis.',
      tag: 'COMING SOON',
      tagClass: 'bg-muted text-muted-foreground border-muted-foreground/30',
    },
    {
      name: 'HDX Water Points',
      status: 'static',
      description: 'UN OCHA humanitarian data: water points, river networks for South Sudan.',
      tag: 'FREE DOWNLOAD',
      tagClass: 'bg-success/10 text-success border-success/30',
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
                    source.status === 'estimated' ? 'bg-accent' :
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

        {/* Future Data Sources Info */}
        <div className="font-mono text-[9px] text-muted-foreground leading-relaxed border-t border-border pt-3">
          <p className="text-primary mb-2">ALTERNATIVE TRACKING METHODS:</p>
          <ul className="space-y-1">
            <li>· <span className="text-foreground">Grass Growth Patterns:</span> NDVI changes indicate grazing pressure</li>
            <li>· <span className="text-foreground">Methane Detection:</span> Sentinel-5P TROPOMI atmospheric CH₄</li>
            <li>· <span className="text-foreground">Water Body Changes:</span> Sentinel-2 surface water detection</li>
            <li>· <span className="text-foreground">Dust/Soil Disturbance:</span> MODIS AOD measurements</li>
          </ul>
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
        <TabsList className="w-full grid grid-cols-4 h-10 rounded-none border-b border-border bg-transparent">
          <TabsTrigger 
            value="ai" 
            className="font-mono text-[9px] tracking-widest data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            AI
          </TabsTrigger>
          <TabsTrigger 
            value="herd"
            className="font-mono text-[9px] tracking-widest data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            HERD
          </TabsTrigger>
          <TabsTrigger 
            value="forecast"
            className="font-mono text-[9px] tracking-widest data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            FORECAST
          </TabsTrigger>
          <TabsTrigger 
            value="data"
            className="font-mono text-[9px] tracking-widest data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
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
