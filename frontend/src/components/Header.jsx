import React from 'react';
import { motion } from 'framer-motion';
import { useData } from '../context/DataContext';
import { formatNumber } from '../lib/dataUtils';
import { Satellite, Droplets, Activity, Radar, Sun, Moon, AlertTriangle, Shield, Flame, Clock } from 'lucide-react';
import { Switch } from './ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Badge } from './ui/badge';

export const Header = () => {
  const { stats, lastUpdated, isSimpleMode, toggleSimpleMode, isLoading, conflictZones, fires } = useData();
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Count critical/high zones
  const criticalCount = conflictZones?.filter(z => z.real_time_level === 'Critical' || z.risk_level === 'Critical').length || 0;
  const highCount = conflictZones?.filter(z => z.real_time_level === 'High' || z.risk_level === 'High').length || 0;
  const fireCount = fires?.length || 0;

  // Format data age
  const getDataAge = () => {
    if (!lastUpdated) return 'Loading...';
    const date = new Date(lastUpdated);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) return `${diffSecs}s ago`;
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${Math.floor(diffMins / 60)}h ago`;
  };

  const statItems = [
    { 
      label: 'HERDS', 
      value: stats?.total_herds || '—',
      status: 'ESTIMATED',
      icon: Radar,
      color: 'text-primary'
    },
    { 
      label: 'CATTLE', 
      value: stats?.total_cattle ? `~${Math.round(stats.total_cattle / 1000)}K` : '—',
      status: 'ESTIMATED',
      icon: Activity,
      color: 'text-primary'
    },
    { 
      label: 'RAIN 7D', 
      value: stats?.rain_7day_mm !== undefined ? `${stats.rain_7day_mm}mm` : '—',
      status: 'LIVE',
      icon: Droplets,
      color: 'text-accent'
    },
    { 
      label: 'NDVI', 
      value: stats?.avg_ndvi?.toFixed(2) || '—',
      status: stats?.gee_status === 'CONNECTED' ? 'LIVE' : 'HIST',
      icon: Satellite,
      color: 'text-success'
    },
    { 
      label: 'CRITICAL', 
      value: criticalCount,
      status: 'HIST',
      icon: AlertTriangle,
      color: criticalCount > 0 ? 'text-destructive' : 'text-muted-foreground'
    },
    { 
      label: 'HIGH', 
      value: highCount,
      status: 'HIST',
      icon: Shield,
      color: highCount > 0 ? 'text-warning' : 'text-muted-foreground'
    },
  ];

  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-14 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6 shrink-0 z-50"
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="font-display text-xl lg:text-2xl font-extrabold tracking-widest text-primary">
            BOVINE
          </h1>
          <p className="font-mono text-[8px] lg:text-[9px] text-muted-foreground tracking-[3px] -mt-0.5">
            CATTLE MOVEMENT INTELLIGENCE · SOUTH SUDAN
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="hidden md:flex items-center gap-3 lg:gap-5">
        {statItems.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="text-center"
          >
            <div className={`font-mono text-sm lg:text-base font-bold ${stat.color}`}>
              {isLoading ? <span className="shimmer inline-block w-8 h-4 rounded" /> : stat.value}
            </div>
            <div className="font-mono text-[7px] lg:text-[8px] text-muted-foreground tracking-widest flex items-center justify-center gap-1">
              {stat.label}
              <span className={`text-[6px] px-1 rounded ${
                stat.status === 'LIVE' ? 'bg-success/20 text-success' :
                stat.status === 'ESTIMATED' ? 'bg-warning/20 text-warning' :
                'bg-muted text-muted-foreground'
              }`}>
                {stat.status}
              </span>
            </div>
          </motion.div>
        ))}
        {/* Fire indicator */}
        {fireCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="font-mono text-sm lg:text-base font-bold text-orange-500 flex items-center gap-1">
              <Flame className="h-4 w-4 animate-pulse" />
              {fireCount}
            </div>
            <div className="font-mono text-[7px] lg:text-[8px] text-muted-foreground tracking-widest flex items-center justify-center gap-1">
              FIRES
              <span className="text-[6px] px-1 rounded bg-orange-500/20 text-orange-400">LIVE</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Right side - Mode toggle & Live badge */}
      <div className="flex items-center gap-3 lg:gap-4">
        {/* Data freshness indicator */}
        <div className="hidden lg:flex flex-col items-end">
          <div className="font-mono text-[7px] text-muted-foreground tracking-wider">DATA AGE</div>
          <div className="font-mono text-[10px] text-success">{getDataAge()}</div>
        </div>

        {/* Simple Mode Toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <Moon className="h-3.5 w-3.5 text-muted-foreground" />
                <Switch 
                  checked={isSimpleMode}
                  onCheckedChange={toggleSimpleMode}
                  className="data-[state=checked]:bg-success"
                />
                <Sun className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{isSimpleMode ? 'Simple Mode' : 'Tactical Mode'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Live indicator */}
        <div className="flex items-center gap-2 font-mono text-[9px] lg:text-[10px] text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-success pulse-live" />
          <span className="hidden sm:inline">
            {currentTime.toUTCString().slice(5, 25)} UTC
          </span>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
