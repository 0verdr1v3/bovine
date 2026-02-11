# BOVINE - Cattle Movement Intelligence System

## Product Overview
A Bloomberg-style terminal for tracking and predicting cattle movement in South Sudan to help mitigate conflict, resource scarcity, and humanitarian risks. Built for the United Nations.

## Core Requirements
- **ALL DATA MUST BE REAL** - No simulated data
- Dark, tactical, and modern interface
- Mobile-responsive design
- Evidence-based herd location estimation
- AI-powered analysis using Emergent LLM

## Architecture

### Tech Stack
- **Frontend**: React, Tailwind CSS, Leaflet.js, Framer Motion
- **Backend**: Python FastAPI
- **Database**: MongoDB (batched data cache)
- **AI**: Claude via Emergent LLM
- **Satellite Data**: Google Earth Engine

### Data Pipeline
All external API data is fetched in 10-minute batches and stored in MongoDB to:
1. Respect API rate limits
2. Ensure consistent data availability
3. Reduce latency for users

## Integrated Data Sources (ALL REAL)

### Live Data (10-minute batch refresh)
| Source | Data Type | Status |
|--------|-----------|--------|
| Google Earth Engine | MODIS NDVI vegetation | ✅ LIVE |
| Open-Meteo | Weather forecasts | ✅ CACHED |
| ACLED | Conflict events | ✅ CACHED |
| NASA FIRMS | Fire hotspots | ✅ CACHED |
| ReliefWeb | Humanitarian news | ✅ CACHED |

### Reference Data
| Source | Data Type |
|--------|-----------|
| FAO | Livestock census (~17.7M cattle) |
| IGAD | Migration corridors |
| OpenStreetMap | Water bodies |
| FEWS NET | Food security |
| UNHCR/IOM | Displacement data |

## API Endpoints

### Data Endpoints
- `GET /api/herds` - Evidence-based herd estimates
- `GET /api/weather` - Weather from MongoDB cache
- `GET /api/conflict-zones` - ACLED conflict zones
- `GET /api/fires` - NASA FIRMS fire hotspots
- `GET /api/food-security` - FEWS NET IPC data
- `GET /api/news` - ReliefWeb news articles
- `GET /api/grazing-regions` - GEE NDVI by region
- `GET /api/data-sources` - Status of all sources

### Control Endpoints
- `POST /api/trigger-update` - Manual batch refresh
- `POST /api/ai/analyze` - AI-powered analysis

## Environment Variables

### Backend (.env)
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
CORS_ORIGINS="*"
EMERGENT_LLM_KEY="sk-emergent-..."
GOOGLE_MAPS_API_KEY="..."
GEE_PROJECT_ID="lucid-course-415903"
GEE_CLIENT_EMAIL="bovine@lucid-course-415903.iam.gserviceaccount.com"
```

### GEE Credentials
Stored in `/app/backend/gee_credentials.json` (service account JSON)

## Key Files
- `/app/backend/server.py` - All API logic and data fetchers
- `/app/backend/gee_credentials.json` - Google Earth Engine credentials
- `/app/frontend/src/context/DataContext.jsx` - State management
- `/app/frontend/src/components/RightPanel.jsx` - AI, Herd, Zone, Food, Data tabs
- `/app/frontend/src/components/MapView.jsx` - Leaflet map

## What's Implemented ✅

### Phase 1 - Core Infrastructure
- [x] React/FastAPI project structure
- [x] Dark tactical design system
- [x] MongoDB integration
- [x] Batched data update system (10-min intervals)

### Phase 2 - Data Sources
- [x] Google Earth Engine NDVI (LIVE)
- [x] Open-Meteo weather
- [x] ACLED conflict data
- [x] NASA FIRMS fire detection
- [x] ReliefWeb news
- [x] FAO livestock statistics
- [x] IGAD migration corridors
- [x] OSM water sources
- [x] FEWS NET food security
- [x] UNHCR displacement data

### Phase 3 - UI/UX
- [x] Interactive Leaflet map with satellite view
- [x] 8 tracked herds with evidence
- [x] Conflict zone visualization
- [x] Weather overlay
- [x] Data sources dashboard
- [x] AI analysis panel

### Phase 4 - AI Integration
- [x] Emergent LLM (Claude) integration
- [x] Context-aware analysis
- [x] Quick question presets

## Upcoming Tasks (P1)

### Simple Mode
- [ ] Add toggle for simplified UI
- [ ] Reduce visual complexity for non-technical users

### Mobile Responsiveness
- [ ] Test and optimize for mobile devices
- [ ] Adjust layouts for smaller screens

## Future/Backlog (P2)

### Enhanced Predictions
- [ ] Backtest predictive models with historical data
- [ ] Machine learning-based conflict prediction

### High-Resolution Imagery
- [ ] Integration with Planet Labs or Maxar
- [ ] On-demand satellite captures

### Real-Time Tracking
- [ ] Explore IoT collar integration
- [ ] SMS-based ground reports

## Last Updated
February 11, 2026

## Notes
- ACLED API may be unreachable due to DNS issues - uses cached/historical data
- GEE credentials stored securely in backend directory
- All API keys stored in .env files, not hardcoded
