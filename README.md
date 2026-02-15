# BOVINE - Cattle Movement Intelligence System

> **Bloomberg-style terminal for tracking and predicting cattle movement in South Sudan to mitigate conflict, resource scarcity, and humanitarian risks.**

![BOVINE Dashboard](docs/screenshots/dashboard.png)

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB 6.0+
- Google Earth Engine account (free)

### 1. Clone Repository
```bash
git clone https://github.com/your-org/bovine-intelligence.git
cd bovine-intelligence
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install emergent integrations (for AI)
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
```

### 3. Configure Environment Variables

Create `backend/.env`:
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="bovine_db"
CORS_ORIGINS="*"
EMERGENT_LLM_KEY="your-emergent-llm-key"
GOOGLE_MAPS_API_KEY="your-google-maps-key"
GEE_PROJECT_ID="your-gee-project-id"
GEE_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
```

### 4. Google Earth Engine Setup

1. Go to [Google Earth Engine](https://earthengine.google.com/)
2. Sign up for a free account
3. Create a Service Account:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create new project or select existing
   - Enable Earth Engine API
   - Go to IAM & Admin > Service Accounts
   - Create service account with Earth Engine role
   - Generate JSON key
4. Save the JSON key as `backend/gee_credentials.json`

### 5. Frontend Setup
```bash
cd ../frontend

# Install dependencies
yarn install  # or npm install

# Create environment file
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env
```

### 6. Start Services

Terminal 1 - MongoDB:
```bash
mongod
```

Terminal 2 - Backend:
```bash
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Terminal 3 - Frontend:
```bash
cd frontend
yarn start
```

Access the app at `http://localhost:3000`

---

## 📊 Data Sources (13 Total)

### LIVE Data (Auto-refreshed every 10 minutes)

| Source | Data Type | API |
|--------|-----------|-----|
| **Google Earth Engine** | NDVI, Soil Moisture, Rainfall, Floods | Service Account |
| **Open-Meteo** | Weather forecasts | Free, no key |
| **ACLED** | Conflict events | Free, register at acleddata.com |
| **NASA FIRMS** | Fire hotspots | Free, register at firms.modaps.eosdis.nasa.gov |
| **RainViewer** | Radar imagery | Free |
| **ReliefWeb** | Humanitarian news | Free |
| **GDACS** | Disaster alerts | Free |

### Reference Data (Static/Historical)

| Source | Data Type | Notes |
|--------|-----------|-------|
| **FAO** | Livestock census | ~17.7M cattle baseline |
| **IGAD** | Migration corridors | Historical routes |
| **OpenStreetMap** | Water bodies | Geographic features |
| **FEWS NET** | Food security | IPC classifications |
| **UNHCR/IOM** | Displacement | IDP/refugee data |

### AI Analysis

| Provider | Model | Key |
|----------|-------|-----|
| **Anthropic Claude** | claude-sonnet-4 | Emergent LLM Key |

---

## 🔑 API Keys & Credentials

### Required (Free)

1. **Emergent LLM Key** (for AI analysis)
   - Sign up at [Emergent Platform](https://emergentagent.com)
   - Get your universal LLM key from Profile > Settings

2. **Google Earth Engine** (for satellite data)
   - Free at [earthengine.google.com](https://earthengine.google.com)
   - Create service account JSON key

### Optional (Enhance functionality)

3. **ACLED API Key** (for conflict data)
   - Free registration at [acleddata.com](https://acleddata.com/register/)

4. **NASA FIRMS API Key** (for fire data)
   - Free at [firms.modaps.eosdis.nasa.gov](https://firms.modaps.eosdis.nasa.gov/api/area/)

---

## 📁 Project Structure

```
bovine-intelligence/
├── backend/
│   ├── server.py              # FastAPI application
│   ├── gee_credentials.json   # GEE service account (DO NOT COMMIT)
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Environment variables (DO NOT COMMIT)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── LeftPanel.jsx
│   │   │   ├── MapView.jsx
│   │   │   └── RightPanel.jsx
│   │   ├── context/
│   │   │   └── DataContext.jsx
│   │   ├── lib/
│   │   │   └── dataUtils.js
│   │   └── index.css
│   ├── package.json
│   └── .env
└── README.md
```

---

## 🌐 API Endpoints

### Data Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/herds` | GET | Evidence-based herd estimates |
| `/api/weather` | GET | Weather forecasts |
| `/api/weather/multi-location` | GET | Weather for all locations |
| `/api/weather/radar` | GET | Radar tile URLs |
| `/api/ndvi` | GET | Vegetation index |
| `/api/soil-moisture` | GET | NASA SMAP data |
| `/api/rainfall` | GET | CHIRPS rainfall |
| `/api/nighttime-lights` | GET | VIIRS radiance |
| `/api/conflict-zones` | GET | ACLED-based zones |
| `/api/historical-conflicts` | GET | Raw ACLED events |
| `/api/fires` | GET | NASA FIRMS hotspots |
| `/api/floods` | GET | JRC flood risk |
| `/api/disasters` | GET | GDACS alerts |
| `/api/food-security` | GET | FEWS NET IPC |
| `/api/displacement` | GET | UNHCR/IOM data |
| `/api/news` | GET | ReliefWeb articles |
| `/api/stats` | GET | Dashboard statistics |
| `/api/data-sources` | GET | Source status |

### Control Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/trigger-update` | POST | Manual batch refresh |
| `/api/ai/analyze` | POST | AI-powered analysis |

---

## 📈 Data Status Indicators

The system uses clear status indicators for transparency:

| Status | Meaning | Example |
|--------|---------|---------|
| **LIVE** | Real-time from API/satellite | Weather, NDVI |
| **ESTIMATED** | Derived from real data | Herd positions |
| **HISTORICAL** | Verified historical records | Conflict patterns |
| **STATIC** | Reference data | Water sources |
| **CACHED** | Recently fetched | News articles |

**Important**: Herd locations are ESTIMATED using:
- FAO livestock census baseline
- GEE satellite NDVI analysis
- IGAD historical migration patterns
- Ground reports from UNMISS, WFP, IOM

We cannot GPS-track individual cattle without IoT collars.

---

## 🔄 Batch Update System

All external API data is fetched in 10-minute batches and cached in MongoDB:

1. **Why batching?** Respects API rate limits
2. **What's updated?**
   - Weather (8 locations)
   - NDVI (8 regions)
   - Soil moisture (6 regions)
   - CHIRPS rainfall (6 regions)
   - Nighttime lights (6 locations)
   - Conflict events (ACLED)
   - Fire hotspots (FIRMS)
   - Flood risk (JRC)
   - Disaster alerts (GDACS)
   - News (ReliefWeb)

3. **Manual trigger**: `POST /api/trigger-update`

---

## 🚀 Deployment

### Docker
```bash
docker-compose up -d
```

### Environment Variables for Production
```env
MONGO_URL="mongodb://your-mongo-host:27017"
DB_NAME="bovine_production"
CORS_ORIGINS="https://your-domain.com"
EMERGENT_LLM_KEY="your-production-key"
GEE_PROJECT_ID="your-project"
GEE_CLIENT_EMAIL="your-sa@project.iam.gserviceaccount.com"
```

### Security Checklist
- [ ] Never commit `.env` files
- [ ] Never commit `gee_credentials.json`
- [ ] Use HTTPS in production
- [ ] Restrict CORS_ORIGINS
- [ ] Set up MongoDB authentication

---

## 📚 Additional Documentation

- [Data Source Details](docs/DATA_SOURCES.md)
- [API Reference](docs/API_REFERENCE.md)
- [Architecture Overview](docs/ARCHITECTURE.md)
- [Contributing Guidelines](CONTRIBUTING.md)

---

## 📄 License

This project is built for humanitarian purposes. 

---

## 🙏 Acknowledgments

- United Nations OCHA
- FAO South Sudan
- ACLED
- NASA FIRMS
- Google Earth Engine
- IGAD CEWARN
- FEWS NET
- UNMISS
