# BOVINE Technical Stack Documentation

## Complete Technology Deep Dive

BOVINE (Building Operational Visibility for Integrated Nomadic Ecosystems) is a full-stack humanitarian monitoring platform designed for tracking cattle movement in South Sudan. This document provides an exhaustive explanation of every technology, library, API, and architectural decision in the system.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Frontend Stack](#frontend-stack)
3. [Backend Stack](#backend-stack)
4. [Database Layer](#database-layer)
5. [Data Sources & APIs](#data-sources--apis)
6. [Real-Time Data Pipeline](#real-time-data-pipeline)
7. [AI Integration](#ai-integration)
8. [Geospatial Processing](#geospatial-processing)
9. [Security & Authentication](#security--authentication)
10. [Performance Optimizations](#performance-optimizations)
11. [Deployment Architecture](#deployment-architecture)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER BROWSER                                    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         REACT SPA (Port 3000)                          │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │ │
│  │  │  Header  │ │LeftPanel │ │  MapView │ │RightPanel│ │Dashboard │     │ │
│  │  │  Stats   │ │  Herds   │ │ Leaflet  │ │ AI Chat  │ │  Layout  │     │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │ │
│  │                              │                                          │ │
│  │                    DataContext (Global State)                           │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS / REST API
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         KUBERNETES INGRESS                                   │
│                    (Routes /api/* to backend:8001)                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FASTAPI BACKEND (Port 8001)                          │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     API Router (/api/*)                               │   │
│  │  /herds  /weather  /conflicts  /fires  /methane  /analyze  /news     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                   DataUpdateScheduler (APScheduler)                   │   │
│  │                    Background job every 10 minutes                    │   │
│  │                                                                       │   │
│  │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │   │ Weather │ │  NDVI   │ │ Conflict│ │  Fires  │ │ Methane │  ...  │   │
│  │   │ Fetcher │ │ Fetcher │ │ Fetcher │ │ Fetcher │ │ Fetcher │       │   │
│  │   └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                    ┌───────────────┴───────────────┐                        │
│                    ▼                               ▼                        │
│         ┌─────────────────┐             ┌─────────────────┐                │
│         │    MongoDB      │             │  Google Earth   │                │
│         │   (Data Cache)  │             │     Engine      │                │
│         └─────────────────┘             └─────────────────┘                │
└─────────────────────────────────────────────────────────────────────────────┘
                    │                               │
                    │                               │
        ┌───────────┴───────────┐       ┌──────────┴──────────┐
        ▼                       ▼       ▼                      ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Open-Meteo  │  │    ACLED     │  │  NASA FIRMS  │  │  Sentinel-5P │
│   Weather    │  │   Conflict   │  │    Fires     │  │   Methane    │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

---

## Frontend Stack

### Core Framework: React 18

**Why React?**
- Component-based architecture perfect for data-dense dashboards
- Virtual DOM ensures efficient updates when real-time data changes
- Huge ecosystem of mapping and visualization libraries
- Hooks API enables clean state management without class complexity

**Key React Features Used:**
```javascript
// Hooks for state and side effects
useState, useEffect, useCallback, useRef, useContext

// Context API for global state (avoids prop drilling)
const DataContext = createContext(null);

// Custom hook pattern
export const useData = () => useContext(DataContext);
```

### State Management: React Context + useState

Instead of Redux or Zustand, BOVINE uses React's built-in Context API because:
- Data flows primarily from API → UI (not complex user interactions)
- Single source of truth in `DataContext.jsx`
- Simpler mental model for humanitarian data visualization
- No need for time-travel debugging or complex middleware

**DataContext manages:**
- 14 data source states (herds, weather, conflicts, fires, methane, etc.)
- UI state (selectedHerd, selectedConflictZone, layers)
- Loading and error states
- Tab synchronization between panels

### Styling: Tailwind CSS

**Configuration:**
```javascript
// tailwind.config.js - Custom theme
{
  colors: {
    background: '#0a0f14',      // Deep navy black
    foreground: '#e5e5e5',      // Soft white
    card: '#0d1117',            // Card backgrounds
    primary: '#d4a844',         // Gold accent
    destructive: '#ef4444',     // Red for alerts
    success: '#22c55e',         // Green for positive
    accent: '#3b82f6',          // Blue for water/info
  }
}
```

**Why Tailwind?**
- Utility-first approach = faster iteration
- No CSS file bloat
- Consistent spacing/color system
- Excellent for "Bloomberg terminal" aesthetic with precise control

### Mapping: Leaflet.js + React-Leaflet

**Why Leaflet over Mapbox/Google Maps?**
- Open source (no API key costs for basic usage)
- Lightweight (~40KB)
- Extensive plugin ecosystem
- Works offline with cached tiles

**Map Layers Implemented:**
```javascript
// Base layer - ESRI World Imagery (free satellite tiles)
<TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />

// Weather overlays - OpenWeatherMap
<TileLayer url={`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png`} />
<TileLayer url={`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png`} />

// Custom layers
- CircleMarkers for herds (color-coded by NDVI)
- Polygons for conflict zones (color-coded by risk)
- Polylines for migration corridors
- Markers for water sources and fire hotspots
```

### Animation: Framer Motion

Used for micro-interactions that make the dashboard feel responsive:
```javascript
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  whileHover={{ scale: 1.01 }}
  transition={{ delay: i * 0.03 }}  // Staggered animations
/>
```

**Where animations are used:**
- Card hover states
- List item entrances (staggered)
- Tab transitions
- Loading skeletons (shimmer effect)
- Data refresh indicators

### Component Library: shadcn/ui

Pre-built, accessible components customized for BOVINE's aesthetic:
- `ScrollArea` - Custom scrollbars matching dark theme
- `Tabs` - Panel navigation
- `Badge` - Status indicators (LIVE, ESTIMATED, CACHED)
- `Switch` - Map layer toggles
- `Sonner` - Toast notifications for alerts

**Why shadcn over Material UI or Chakra?**
- Copy-paste model = full control over code
- Tailwind-native = consistent styling
- Radix primitives = accessibility built-in
- No heavy runtime dependencies

### HTTP Client: Axios

```javascript
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Parallel data fetching
const [herdsRes, weatherRes, conflictsRes] = await Promise.all([
  axios.get(`${API}/herds`).catch(e => ({ data: { herds: [] } })),
  axios.get(`${API}/weather`).catch(e => ({ data: null })),
  axios.get(`${API}/conflict-zones`).catch(e => ({ data: { zones: [] } })),
]);
```

**Error handling strategy:**
- Each request has a `.catch()` fallback
- UI gracefully degrades (empty arrays, loading states)
- Toast notifications for critical failures

### Icons: Lucide React

```javascript
import { 
  Satellite,      // Herd tracking
  Shield,         // Conflict zones
  Droplets,       // Water sources
  Flame,          // Fire hotspots
  Wind,           // Weather
  AlertTriangle,  // Warnings
  Activity,       // Methane
} from 'lucide-react';
```

---

## Backend Stack

### Core Framework: FastAPI

**Why FastAPI?**
- Native async/await support (critical for parallel API calls)
- Automatic OpenAPI documentation
- Pydantic validation for request/response schemas
- Type hints throughout = fewer runtime errors
- Performance comparable to Node.js/Go

**Key FastAPI features:**
```python
# Async endpoint example
@api_router.get("/herds")
async def get_herds():
    herds = await generate_evidence_based_herds()
    return {"herds": herds, "data_status": "ESTIMATED"}

# Router organization
api_router = APIRouter(prefix="/api")
app.include_router(api_router)
```

### Background Jobs: APScheduler

The backbone of BOVINE's real-time data pipeline:

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

class DataUpdateScheduler:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.update_interval = timedelta(minutes=10)
    
    def start(self):
        self.scheduler.add_job(
            self.run_batch_update,
            trigger=IntervalTrigger(minutes=10),
            id='batch_update',
            replace_existing=True
        )
        self.scheduler.start()
```

**Why batch updates instead of real-time streaming?**
- Most data sources have rate limits (ACLED, NASA FIRMS)
- Satellite data (GEE) only updates every 1-16 days anyway
- Reduces server load and costs
- 10-minute freshness is sufficient for humanitarian planning

### HTTP Client: httpx

Async HTTP client for external API calls:

```python
async with httpx.AsyncClient(timeout=30.0) as client:
    response = await client.get(
        "https://api.open-meteo.com/v1/forecast",
        params={
            "latitude": 7.0,
            "longitude": 30.0,
            "daily": "precipitation_sum,temperature_2m_max",
            "forecast_days": 14
        }
    )
```

**Why httpx over requests?**
- Native async support
- HTTP/2 support
- Connection pooling
- Timeout handling

### CORS Configuration

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Kubernetes handles security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Database Layer

### MongoDB (via Motor)

**Why MongoDB?**
- Schema-less = easy to store diverse API responses
- Geospatial indexes for location queries
- Document model matches JSON API responses naturally
- Motor provides async drivers

**Collections:**
```
bovine_db/
├── weather_cache        # Open-Meteo responses
├── ndvi_cache           # GEE NDVI by region
├── soil_moisture_cache  # NASA SMAP data
├── chirps_cache         # Rainfall data
├── fire_cache           # NASA FIRMS hotspots
├── acled_events         # Raw conflict events
├── methane_cache        # Sentinel-5P CH4
├── news_cache           # ReliefWeb articles
├── disaster_cache       # GDACS alerts
├── ai_history           # Analysis conversation log
└── gee_cache            # General GEE data
```

**Async MongoDB operations:**
```python
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(os.environ.get('MONGO_URL'))
db = client[os.environ.get('DB_NAME', 'bovine_db')]

# Upsert pattern for caching
await db.weather_cache.update_one(
    {"location": location_name},
    {"$set": {**weather_data, "updated_at": datetime.now(timezone.utc)}},
    upsert=True
)

# Query with projection (exclude _id for JSON serialization)
cursor = db.fire_cache.find({}, {"_id": 0})
fires = await cursor.to_list(1000)
```

**Why cache in MongoDB instead of Redis?**
- Data needs persistence across restarts
- Complex documents (nested JSON)
- No need for sub-second cache invalidation
- Simpler stack (one database)

---

## Data Sources & APIs

### 1. Google Earth Engine (GEE)

**The most powerful component of BOVINE.** GEE provides access to petabytes of satellite imagery through a Python API.

**Authentication:**
```python
from google.oauth2 import service_account
import ee

credentials = service_account.Credentials.from_service_account_file(
    'gee_credentials.json',
    scopes=['https://www.googleapis.com/auth/earthengine']
)
ee.Initialize(credentials=credentials, project=GEE_PROJECT_ID)
```

**Datasets used:**

| Dataset | ID | Resolution | Update Frequency |
|---------|------|------------|------------------|
| MODIS NDVI | `MODIS/061/MOD13Q1` | 250m | 16 days |
| NASA SMAP Soil Moisture | `NASA/SMAP/SPL3SMP_E/006` | 9km | Daily |
| CHIRPS Rainfall | `UCSB-CHG/CHIRPS/DAILY` | 5.5km | Daily |
| VIIRS Nighttime Lights | `NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG` | 500m | Monthly |
| JRC Surface Water | `JRC/GSW1_4/GlobalSurfaceWater` | 30m | Monthly |
| Sentinel-5P Methane | `COPERNICUS/S5P/OFFL/L3_CH4` | 7km | Daily |

**Example: Fetching NDVI for South Sudan regions**
```python
regions = [
    {"name": "Jonglei", "lat": 7.0, "lng": 32.0},
    {"name": "Unity", "lat": 9.0, "lng": 29.5},
    # ...
]

ndvi_collection = ee.ImageCollection('MODIS/061/MOD13Q1') \
    .filterDate(start_date, end_date) \
    .select('NDVI')

for region in regions:
    point = ee.Geometry.Point([region["lng"], region["lat"]])
    buffer = point.buffer(50000)  # 50km radius
    
    result = ndvi_collection.mean().reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=buffer,
        scale=500,
        maxPixels=1e9
    ).getInfo()
    
    # MODIS NDVI is scaled by 10000
    ndvi_value = (result.get('NDVI', 0) or 0) / 10000
```

### 2. ACLED (Armed Conflict Location & Event Data)

**API endpoint:** `https://api.acleddata.com/acled/read`

**Query:**
```python
params = {
    "key": "public",  # Free tier
    "email": "public@example.com",
    "country": "South Sudan",
    "event_date": f"{start_date}|{end_date}",
    "event_date_where": "BETWEEN",
    "limit": 500
}
```

**Data returned:**
- Event type (battle, violence against civilians, riots)
- Location (lat/lng)
- Fatalities
- Actors involved
- Date

**Processing into risk zones:**
```python
# Group events by 0.5° grid cells
grid_key = (round(lat * 2) / 2, round(lng * 2) / 2)

# Calculate risk score
risk_score = min(100, 20 + event_count * 5 + total_fatalities * 2)
```

### 3. NASA FIRMS (Fire Information for Resource Management)

**API endpoint:** `https://firms.modaps.eosdis.nasa.gov/api/country/csv/...`

```python
# Fetch fires for South Sudan in last 7 days
url = f"{FIRMS_BASE}/SSD/7/{FIRMS_API_KEY}"
```

**Returns:**
- Latitude/longitude
- Brightness temperature
- Confidence level
- Acquisition time
- Satellite (VIIRS/MODIS)

### 4. Open-Meteo

**Free, no-API-key weather forecasts.**

```python
response = await client.get("https://api.open-meteo.com/v1/forecast", params={
    "latitude": lat,
    "longitude": lng,
    "daily": "precipitation_sum,temperature_2m_max,temperature_2m_min",
    "hourly": "temperature_2m,precipitation,windspeed_10m",
    "forecast_days": 14
})
```

### 5. ReliefWeb

**Humanitarian news aggregator.**

```python
params = {
    "appname": "rwint-user-0",
    "profile": "list",
    "preset": "latest",
    "filter[field]": "country",
    "filter[value]": "South Sudan",
    "limit": 25
}
response = await client.get("https://api.reliefweb.int/v1/reports", params=params)
```

### 6. GDACS (Global Disaster Alert Coordination System)

**RSS feed for disaster alerts:**
```python
# Earthquakes, floods, cyclones, droughts, wildfires
# Within 2000km of South Sudan
response = await client.get(f"https://www.gdacs.org/xml/rss.xml?...")
```

---

## Real-Time Data Pipeline

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        APScheduler (Every 10 min)                    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     asyncio.gather() - Parallel Fetch                │
│                                                                      │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│   │  GEE     │ │Open-Meteo│ │  ACLED   │ │  FIRMS   │ │ Sentinel │ │
│   │  NDVI    │ │ Weather  │ │ Conflict │ │  Fires   │ │  Methane │ │
│   └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
│        │            │            │            │            │        │
└────────┼────────────┼────────────┼────────────┼────────────┼────────┘
         │            │            │            │            │
         ▼            ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          MongoDB Cache                               │
│                                                                      │
│   ndvi_cache  weather_cache  acled_events  fire_cache  methane_cache│
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   API Endpoints (read from cache)                    │
│                                                                      │
│   /api/herds    /api/weather    /api/conflicts    /api/fires        │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend DataContext                          │
│                  (Polls every 5 min, stores in state)               │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Alert Detection System                           │
│         (Compares new data to previous, triggers toasts)            │
└─────────────────────────────────────────────────────────────────────┘
```

### Alert Detection (Frontend)

```javascript
// Store previous data for comparison
const prevDataRef = useRef({ news: [], conflicts: [], fires: [], herds: [] });

// On each fetch
if (!isFirstLoad.current) {
    // New conflict zones
    const freshConflicts = newConflicts.filter(c => !prevIds.has(c.id));
    if (freshConflicts.length > 0) {
        toast.warning(`⚠️ ${freshConflicts.length} new conflict zones detected`);
    }
    
    // Risk escalations
    const escalated = newConflicts.filter(c => {
        const prev = prevConflicts.find(p => p.id === c.id);
        return prev && c.risk_score > prev.risk_score + 5;
    });
    if (escalated.length > 0) {
        toast.error(`🚨 Risk escalation in ${escalated[0].name}`);
    }
    
    // Rapid herd movement (>12 km/day indicates stress migration)
    const fastMovers = newHerds.filter(h => h.speed >= 12);
}
```

---

## AI Integration

### Emergent LLM (Claude)

BOVINE uses Claude via the Emergent integration library:

```python
from emergentintegrations.llm.anthropic import AnthropicHandler

handler = AnthropicHandler(emergent_api_key=EMERGENT_LLM_KEY)

response = await handler.generate(
    model_name="claude-sonnet-4-20250514",
    user_message=UserMessage(text=query),
    system_message=system_prompt
)
```

### System Prompt Engineering

The AI is given real-time context:
```python
system_prompt = f"""You are BOVINE, a cattle movement tracking system for South Sudan.

CURRENT DATA (ALL REAL - NO SIMULATIONS):

🛰️ GEE SATELLITE DATA (LIVE):
• Jonglei: NDVI 0.350, Soil: 0.28, Rainfall: 45mm/30d
• Unity: NDVI 0.430, Soil: 0.31, Rainfall: 62mm/30d
...

🔥 FIRE HOTSPOTS (LIVE): 12 active fires

⚔️ CONFLICT ZONES:
• Pibor-Murle: 92% risk (Critical) - 15 events, 42 fatalities
...

🐄 TRACKED HERDS (8 ESTIMATED):
• Herd Alfa [Nuer]: ~8,200 cattle | NDVI: 0.350 | Confidence: 82%
...

Be analytical. Cite sources. Indicate data status (LIVE/ESTIMATED/HISTORICAL).
"""
```

---

## Geospatial Processing

### Herd Position Estimation Algorithm

Since no GPS collars exist on cattle, positions are **estimated** using multiple data sources:

```
INPUT DATA:
├── FAO Livestock Census (baseline populations by state)
├── GEE MODIS NDVI (vegetation = grazing quality)
├── IGAD Migration Database (historical corridors)
├── ACLED Conflict Data (herds avoid conflict)
├── Water Source Locations (cattle need water every 2-3 days)
└── Ground Reports (UNMISS, WFP, IOM)

ALGORITHM:
1. Start with FAO population estimates per state
2. Weight positions toward high-NDVI areas (cattle seek grazing)
3. Adjust away from active conflict zones
4. Constrain to historical migration corridors
5. Place within 2-day walking distance of water
6. Calculate confidence based on data agreement

OUTPUT:
├── Estimated lat/lng per herd
├── Estimated head count
├── Movement direction and speed
├── Confidence score (0.76 - 0.96)
└── Evidence object with source citations
```

### Evidence Object Structure

```json
{
  "id": "E",
  "name": "Herd Echo",
  "lat": 6.80,
  "lng": 33.12,
  "heads": 14200,
  "data_status": "ESTIMATED",
  "evidence": {
    "primary_indicators": [
      "CRITICAL: NDVI at 0.31 - severe vegetation stress",
      "Movement speed 14km/day indicates emergency migration",
      "UNMISS early warning: Murle youth mobilization detected"
    ],
    "data_sources": [
      "FAO Livestock Census",
      "GEE MODIS NDVI",
      "IGAD Migration Database",
      "ACLED Conflict Data"
    ],
    "confidence": 0.88,
    "confidence_factors": {
      "fao_census": 0.85,
      "satellite_ndvi": 0.92,
      "igad_routes": 0.80,
      "acled_correlation": 0.85
    }
  }
}
```

---

## Performance Optimizations

### Backend
- **Parallel API calls**: `asyncio.gather()` for all external APIs
- **MongoDB projections**: Exclude `_id` field to avoid serialization
- **Caching**: 10-minute batch updates instead of real-time
- **Connection pooling**: Motor's built-in connection management

### Frontend
- **Parallel data fetching**: `Promise.all()` for all endpoints
- **Memoization**: `useCallback` for expensive functions
- **Lazy loading**: Map tiles load on demand
- **Debounced refreshes**: 5-minute polling interval
- **Skeleton loading**: Immediate visual feedback

### Map
- **Tile caching**: Browser caches satellite imagery
- **Layer visibility**: Only render visible layers
- **Marker clustering**: Could be added for dense herd areas
- **Canvas rendering**: Leaflet uses Canvas for performance

---

## Deployment Architecture

### Kubernetes Configuration

```yaml
# Supervisor manages both services
[program:backend]
command=uvicorn server:app --host 0.0.0.0 --port 8001
directory=/app/backend

[program:frontend]
command=yarn start
directory=/app/frontend
environment=PORT=3000
```

### Environment Variables

**Backend (`/app/backend/.env`):**
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=bovine_db
EMERGENT_LLM_KEY=<from Emergent>
GEE_PROJECT_ID=<Google Cloud project>
```

**Frontend (`/app/frontend/.env`):**
```
REACT_APP_BACKEND_URL=https://your-domain.com
REACT_APP_OPENWEATHER_API_KEY=<for weather tiles>
```

### File Structure

```
/app
├── backend/
│   ├── server.py              # All FastAPI endpoints + scheduler
│   ├── requirements.txt       # Python dependencies
│   ├── .env                   # Environment variables
│   └── gee_credentials.json   # Google Earth Engine service account
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── index.css          # Tailwind + custom styles
│   │   ├── components/
│   │   │   ├── Dashboard.jsx  # Main layout
│   │   │   ├── Header.jsx     # Stats bar
│   │   │   ├── LeftPanel.jsx  # Herds, conflicts, news
│   │   │   ├── MapView.jsx    # Leaflet map
│   │   │   └── RightPanel.jsx # AI chat, details
│   │   ├── context/
│   │   │   └── DataContext.jsx # Global state
│   │   └── lib/
│   │       └── dataUtils.js   # Helper functions
│   ├── public/
│   │   ├── index.html
│   │   ├── favicon.ico        # BOVINE logo
│   │   └── manifest.json      # PWA config
│   └── package.json
├── README.md
├── TECH_STACK.md              # This file
└── TECHNICAL_BREAKDOWN.md     # Architecture overview
```

---

## Summary

BOVINE demonstrates how modern web technologies can be combined to create a powerful humanitarian monitoring tool:

| Layer | Technology | Purpose |
|-------|------------|---------|
| UI Framework | React 18 | Component architecture |
| Styling | Tailwind CSS | Utility-first design |
| Components | shadcn/ui | Accessible primitives |
| Mapping | Leaflet.js | Interactive visualization |
| Animation | Framer Motion | Micro-interactions |
| Notifications | Sonner | Toast alerts |
| Backend | FastAPI | Async API server |
| Scheduler | APScheduler | Background data updates |
| Database | MongoDB | Document caching |
| Satellite Data | Google Earth Engine | NDVI, soil, rainfall |
| Conflict Data | ACLED | Armed events |
| Weather | Open-Meteo | Forecasts |
| Fires | NASA FIRMS | Hotspot detection |
| AI | Claude (Emergent) | Natural language analysis |

The result is a system that ingests 14 real data sources, processes them into actionable intelligence, and presents them in a "Bloomberg terminal" style interface designed for UN humanitarian operations.

---

*Document generated: February 2026*
*BOVINE v2.0 - Cattle Movement Tracking System*
