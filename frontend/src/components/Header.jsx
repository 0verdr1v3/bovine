import React from 'react';
import { motion } from 'framer-motion';
import { useData } from '../context/DataContext';
import { formatNumber } from '../lib/dataUtils';
import { Satellite, Droplets, Activity, Radar, Sun, Moon } from 'lucide-react';
import { Switch } from './ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

export const Header = () => {
  const { stats, lastUpdated, isSimpleMode, toggleSimpleMode, isLoading } = useData();
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const statItems = [
    { 
      label: 'HERDS', 
      value: stats?.total_herds || '—',
      icon: Radar,
      color: 'text-primary'
    },
    { 
      label: 'EST. CATTLE', 
      value: stats?.total_cattle ? `~${Math.round(stats.total_cattle / 1000)}K` : '—',
      icon: Activity,
      color: 'text-primary'
    },
    { 
      label: '7-DAY RAIN', 
      value: stats?.rain_7day_mm ? `${stats.rain_7day_mm}mm` : '—',
      icon: Droplets,
      color: 'text-accent'
    },
    { 
      label: 'AVG NDVI', 
      value: stats?.avg_ndvi?.toFixed(2) || '—',
      icon: Satellite,
      color: 'text-success'
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
      <div className="hidden md:flex items-center gap-4 lg:gap-6">
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
            <div className="font-mono text-[7px] lg:text-[8px] text-muted-foreground tracking-widest">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Right side - Mode toggle & Live badge */}
      <div className="flex items-center gap-3 lg:gap-4">
        {/* Simple Mode Toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <Sun className="h-3.5 w-3.5 text-muted-foreground" />
                <Switch 
                  checked={isSimpleMode}
                  onCheckedChange={toggleSimpleMode}
                  className="data-[state=checked]:bg-success"
                />
                <Moon className="h-3.5 w-3.5 text-muted-foreground" />
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
