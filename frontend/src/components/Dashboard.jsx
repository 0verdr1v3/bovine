import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import { Header } from './Header';
import { LeftPanel } from './LeftPanel';
import { MapView } from './MapView';
import { RightPanel } from './RightPanel';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { Menu, Map, BarChart3, X, Layers } from 'lucide-react';

// Mobile Bottom Navigation
const MobileNav = ({ activeView, setActiveView }) => {
  const navItems = [
    { id: 'map', icon: Map, label: 'Map' },
    { id: 'herds', icon: Layers, label: 'Herds' },
    { id: 'analysis', icon: BarChart3, label: 'Analysis' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border lg:hidden">
      <div className="flex justify-around py-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
              activeView === item.id ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span className="font-mono text-[9px]">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// Loading Skeleton
const LoadingSkeleton = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-background">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center"
    >
      <div className="font-display text-3xl font-extrabold tracking-widest text-primary mb-2">
        BOVINE
      </div>
      <div className="font-mono text-[10px] text-muted-foreground tracking-wider mb-6">
        LOADING DATA...
      </div>
      <div className="flex justify-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
            className="w-2 h-2 rounded-full bg-primary"
          />
        ))}
      </div>
    </motion.div>
  </div>
);

// Error State
const ErrorState = ({ error, onRetry }) => (
  <div className="h-screen w-screen flex items-center justify-center bg-background">
    <div className="text-center p-6">
      <div className="text-destructive text-4xl mb-4">⚠️</div>
      <h2 className="font-display text-xl font-bold mb-2">Data Load Error</h2>
      <p className="font-mono text-sm text-muted-foreground mb-4">{error}</p>
      <Button onClick={onRetry}>Retry</Button>
    </div>
  </div>
);

// Main Dashboard Layout
export const Dashboard = () => {
  const { isLoading, error, fetchAllData } = useData();
  const [mobileView, setMobileView] = useState('map');
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={fetchAllData} />;
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Desktop Layout */}
        <div className="hidden lg:flex flex-1 overflow-hidden">
          {/* Left Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-[310px] flex-shrink-0"
          >
            <LeftPanel />
          </motion.div>

          {/* Map */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex-1 min-w-0"
          >
            <MapView />
          </motion.div>

          {/* Right Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="w-[320px] flex-shrink-0"
          >
            <RightPanel />
          </motion.div>
        </div>

        {/* Mobile Layout */}
        <div className="flex-1 lg:hidden overflow-hidden pb-16">
          <AnimatePresence mode="wait">
            {mobileView === 'map' && (
              <motion.div
                key="map"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                <MapView />
              </motion.div>
            )}
            
            {mobileView === 'herds' && (
              <motion.div
                key="herds"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full"
              >
                <LeftPanel />
              </motion.div>
            )}
            
            {mobileView === 'analysis' && (
              <motion.div
                key="analysis"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full"
              >
                <RightPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav activeView={mobileView} setActiveView={setMobileView} />
    </div>
  );
};

export default Dashboard;
