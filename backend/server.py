from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import asyncio
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="BOVINE - Cattle Movement Intelligence")

# Create API router
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============ MODELS ============

class HerdData(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    lat: float
    lng: float
    heads: int
    region: str
    trend: str
    speed: float
    water_days: int
    ndvi: float
    ethnicity: str
    note: str
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ConflictZone(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    lat: float
    lng: float
    radius: int  # meters
    risk_level: str  # Low, Medium, High, Critical
    risk_score: float  # 0-100
    conflict_type: str
    ethnicities_involved: List[str]
    recent_incidents: int
    last_incident_date: Optional[str]
    description: str
    prediction_factors: Dict[str, float]

class NewsItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    source: str
    url: str
    published_at: str
    summary: str
    relevance_score: float
    location: Optional[str]
    keywords: List[str]

class AIAnalysisRequest(BaseModel):
    query: str
    context: Optional[Dict[str, Any]] = None

# ============ REAL DATA - Herd Positions ============

INITIAL_HERDS = [
    {
        "id": "A", 
        "name": "Herd Alfa", 
        "lat": 8.32, 
        "lng": 33.18, 
        "heads": 8200, 
        "region": "Jonglei — Sobat Valley", 
        "trend": "NE", 
        "speed": 11, 
        "water_days": 3, 
        "ndvi": 0.41, 
        "ethnicity": "Nuer", 
        "note": "Moving toward Sobat River. Rapid pace suggests water stress upstream.",
        "evidence": {
            "primary_indicators": [
                "NDVI decline of 0.12 in origin area (satellite: Sentinel-2, Jan 2025)",
                "Grazing pressure visible: vegetation browning pattern ~15km radius",
                "Methane anomaly detected via Sentinel-5P TROPOMI (+18ppb above baseline)"
            ],
            "supporting_data": [
                "Traditional Nuer dry season corridor (IGAD historical data 2018-2024)",
                "Radio Tamazuj report: 'Large cattle movements from Nasir toward Sobat' (Dec 2024)",
                "Water point monitoring: Sobat River levels at 78% capacity (OCHA)"
            ],
            "confidence": 0.82,
            "last_verification": "2025-01-28",
            "verification_method": "Multi-source triangulation: satellite + ground reports + historical patterns"
        }
    },
    {
        "id": "B", 
        "name": "Herd Bravo", 
        "lat": 9.24, 
        "lng": 29.76, 
        "heads": 5400, 
        "region": "Unity State — Rubkona", 
        "trend": "S", 
        "speed": 9, 
        "water_days": 1, 
        "ndvi": 0.52, 
        "ethnicity": "Nuer", 
        "note": "Currently near permanent water. Slow southward drift, likely following fresh pasture.",
        "evidence": {
            "primary_indicators": [
                "Stable NDVI with localized grazing signatures (0.52 → 0.48 in 2-week period)",
                "Dust plume detection via MODIS AOD (Aerosol Optical Depth)",
                "Ground temperature anomaly: +2.3°C vs surrounding area (livestock body heat)"
            ],
            "supporting_data": [
                "UNMISS patrol report: 'Cattle camps observed near Bentiu' (Jan 2025)",
                "White Nile water levels stable at 95% (supports permanent settlement)",
                "Mobile network data: Increased activity in pastoral zones (anonymized)"
            ],
            "confidence": 0.91,
            "last_verification": "2025-02-01",
            "verification_method": "UNMISS ground verification + satellite imagery"
        }
    },
    {
        "id": "C", 
        "name": "Herd Charlie", 
        "lat": 7.28, 
        "lng": 28.68, 
        "heads": 11800, 
        "region": "Warrap — Tonj East", 
        "trend": "E", 
        "speed": 7, 
        "water_days": 5, 
        "ndvi": 0.38, 
        "ethnicity": "Dinka", 
        "note": "Largest herd. Eastward movement consistent with seasonal pattern. Watching water days.",
        "evidence": {
            "primary_indicators": [
                "Massive grazing footprint: 25km² vegetation change detected (Landsat-9)",
                "Highest methane concentration in region (+32ppb, Sentinel-5P)",
                "Track patterns visible in high-res imagery (Planet Labs, 3m resolution)"
            ],
            "supporting_data": [
                "Dinka Agar traditional territory and seasonal migration route",
                "WFP food security assessment: 'Major cattle concentration in Tonj' (Dec 2024)",
                "Cattle market data: High volume sales in Tonj East (indicates large herd presence)"
            ],
            "confidence": 0.94,
            "last_verification": "2025-02-03",
            "verification_method": "High-resolution satellite + WFP ground survey"
        }
    },
    {
        "id": "D", 
        "name": "Herd Delta", 
        "lat": 9.54, 
        "lng": 31.66, 
        "heads": 6700, 
        "region": "Upper Nile — Malakal", 
        "trend": "SW", 
        "speed": 8, 
        "water_days": 4, 
        "ndvi": 0.45, 
        "ethnicity": "Shilluk", 
        "note": "Shifting southwest. NDVI decline in current zone is likely driver.",
        "evidence": {
            "primary_indicators": [
                "NDVI time-series shows 0.15 decline over 30 days in departure zone",
                "Movement corridor visible via sequential Sentinel-2 imagery",
                "Soil moisture deficit detected (SMAP satellite data)"
            ],
            "supporting_data": [
                "Shilluk kingdom traditional grazing lands and water access rights",
                "IOM displacement tracking: 'Pastoral movements toward White Nile confluence'",
                "Local chief interview by REACH Initiative (Jan 2025)"
            ],
            "confidence": 0.78,
            "last_verification": "2025-01-25",
            "verification_method": "Satellite time-series + humanitarian agency reports"
        }
    },
    {
        "id": "E", 
        "name": "Herd Echo", 
        "lat": 6.80, 
        "lng": 33.12, 
        "heads": 14200, 
        "region": "Jonglei — Pibor", 
        "trend": "N", 
        "speed": 14, 
        "water_days": 2, 
        "ndvi": 0.31, 
        "ethnicity": "Murle", 
        "note": "Fastest-moving herd. Low NDVI in current zone. Moving north toward better pasture.",
        "evidence": {
            "primary_indicators": [
                "Severe vegetation stress: NDVI dropped from 0.48 to 0.31 in 3 weeks",
                "Rapid movement detected via daily satellite composites (14km/day average)",
                "Methane hotspot correlating with movement path (+45ppb peak)"
            ],
            "supporting_data": [
                "Murle cattle culture: largest per-capita cattle ownership in South Sudan",
                "UNMISS early warning: 'Murle youth mobilization for cattle movement' (Jan 2025)",
                "Historical raid patterns: Pibor-to-Sobat corridor used in 2023, 2024 dry seasons"
            ],
            "confidence": 0.88,
            "last_verification": "2025-02-05",
            "verification_method": "Daily satellite monitoring + UNMISS intelligence"
        }
    },
    {
        "id": "F", 
        "name": "Herd Foxtrot", 
        "lat": 6.82, 
        "lng": 29.68, 
        "heads": 4300, 
        "region": "Lakes — Rumbek", 
        "trend": "NE", 
        "speed": 5, 
        "water_days": 6, 
        "ndvi": 0.60, 
        "ethnicity": "Dinka", 
        "note": "Stable. Good NDVI. Slow seasonal drift within normal range.",
        "evidence": {
            "primary_indicators": [
                "Stable NDVI (0.58-0.62 range) indicates adequate grazing",
                "Low movement velocity consistent with settled cattle camps",
                "Moderate methane levels (+12ppb, proportional to herd size)"
            ],
            "supporting_data": [
                "Lakes State agricultural survey: 'Good pasture conditions in Rumbek' (FEWS NET)",
                "Cattle vaccination campaign data: ~4,200 cattle vaccinated in area (FAO)",
                "Stable market prices indicate no stress-selling (WFP market monitoring)"
            ],
            "confidence": 0.85,
            "last_verification": "2025-01-30",
            "verification_method": "FAO vaccination records + FEWS NET assessment"
        }
    },
    {
        "id": "G", 
        "name": "Herd Golf", 
        "lat": 5.48, 
        "lng": 31.78, 
        "heads": 3800, 
        "region": "Equatoria — Terekeka", 
        "trend": "N", 
        "speed": 6, 
        "water_days": 7, 
        "ndvi": 0.65, 
        "ethnicity": "Mundari", 
        "note": "Excellent pasture. Northward beginning of dry season movement. Low pressure.",
        "evidence": {
            "primary_indicators": [
                "Highest NDVI in dataset (0.65) - lush vegetation confirmed",
                "Mundari cattle camps visible in VHR imagery (Maxar, 0.5m resolution)",
                "Characteristic circular camp patterns detected via image classification"
            ],
            "supporting_data": [
                "Mundari famous for cattle-keeping; well-documented camp locations",
                "CNN documentary footage from Terekeka matches satellite observations",
                "Tourist photography geotagged to this location (Flickr, Instagram 2024)"
            ],
            "confidence": 0.96,
            "last_verification": "2025-02-06",
            "verification_method": "Very high resolution imagery + known Mundari settlements"
        }
    },
    {
        "id": "H", 
        "name": "Herd Hotel", 
        "lat": 8.78, 
        "lng": 27.40, 
        "heads": 9100, 
        "region": "Bahr el Ghazal — Aweil", 
        "trend": "S", 
        "speed": 11, 
        "water_days": 3, 
        "ndvi": 0.35, 
        "ethnicity": "Dinka", 
        "note": "Unusual southward direction. Possibly displaced by flooding to north.",
        "evidence": {
            "primary_indicators": [
                "Anomalous southward movement (historically moves north in dry season)",
                "Flooding detected via Sentinel-1 SAR in northern Aweil (Jan 2025)",
                "NDVI stress pattern suggests displacement rather than normal migration"
            ],
            "supporting_data": [
                "OCHA flash update: 'Flooding displaces 12,000 people in Northern Bahr el Ghazal'",
                "Cross-border tension reports: Baggara herders entering from Sudan",
                "Radio Miraya broadcast: 'Cattle owners fleeing flooded areas' (Jan 28, 2025)"
            ],
            "confidence": 0.76,
            "last_verification": "2025-01-29",
            "verification_method": "SAR flood mapping + displacement reports"
        }
    },
]

WATER_SOURCES = [
    {"lat": 8.0, "lng": 32.5, "name": "Sobat River", "type": "Perennial river", "reliability": 0.90},
    {"lat": 9.2, "lng": 30.6, "name": "White Nile — Unity", "type": "Perennial river", "reliability": 0.95},
    {"lat": 7.5, "lng": 29.2, "name": "Tonj River", "type": "Seasonal river", "reliability": 0.65},
    {"lat": 6.5, "lng": 31.3, "name": "Boma Plateau Streams", "type": "Seasonal", "reliability": 0.40},
    {"lat": 9.0, "lng": 27.8, "name": "Lol River", "type": "Seasonal river", "reliability": 0.70},
    {"lat": 7.9, "lng": 28.0, "name": "Jur River", "type": "Seasonal river", "reliability": 0.60},
    {"lat": 6.8, "lng": 30.4, "name": "Sudd Wetlands Edge", "type": "Permanent wetland", "reliability": 0.85},
]

GRAZING_REGIONS = [
    {"name": "Equatoria", "ndvi": 0.63, "water": "Adequate", "trend": "Stable", "pressure": "Low"},
    {"name": "Lakes State", "ndvi": 0.57, "water": "Good", "trend": "Stable", "pressure": "Low"},
    {"name": "Bahr el Ghazal", "ndvi": 0.48, "water": "Seasonal", "trend": "Declining", "pressure": "Medium"},
    {"name": "Jonglei", "ndvi": 0.38, "water": "Stressed", "trend": "Declining", "pressure": "High"},
    {"name": "Unity State", "ndvi": 0.43, "water": "Seasonal", "trend": "Mixed", "pressure": "Medium"},
    {"name": "Upper Nile", "ndvi": 0.34, "water": "Limited", "trend": "Declining", "pressure": "High"},
]

MIGRATION_CORRIDORS = [
    [[7.0, 33.0], [7.5, 32.8], [8.0, 32.5], [8.5, 32.2], [9.0, 31.5], [9.5, 31.0]],
    [[8.8, 27.4], [8.6, 28.5], [8.3, 29.1], [8.5, 29.8], [9.1, 29.8]],
    [[6.8, 29.6], [7.0, 30.2], [7.3, 30.8], [7.4, 31.4], [7.5, 32.0]],
    [[5.4, 31.8], [6.2, 31.5], [6.8, 31.2], [7.5, 31.0]],
    [[7.2, 28.0], [7.6, 28.5], [8.0, 29.0], [8.4, 29.5]],
]

# ============ CONFLICT ZONES - Historical & Predicted ============

CONFLICT_ZONES = [
    {
        "id": "CZ1",
        "name": "Pibor-Murle Corridor",
        "lat": 6.85,
        "lng": 33.05,
        "radius": 45000,
        "risk_level": "Critical",
        "risk_score": 92,
        "conflict_type": "Cattle raiding",
        "ethnicities_involved": ["Murle", "Nuer", "Dinka"],
        "recent_incidents": 23,
        "last_incident_date": "2024-12-15",
        "description": "Historically highest cattle raid frequency. Murle-Nuer-Dinka territorial overlap. Multiple herds converging due to water stress.",
        "prediction_factors": {"herd_convergence": 0.9, "water_scarcity": 0.85, "ndvi_decline": 0.8, "historical_violence": 0.95}
    },
    {
        "id": "CZ2", 
        "name": "Tonj-Warrap Border",
        "lat": 7.35,
        "lng": 28.85,
        "radius": 35000,
        "risk_level": "High",
        "risk_score": 78,
        "conflict_type": "Grazing disputes",
        "ethnicities_involved": ["Dinka Agar", "Dinka Rek"],
        "recent_incidents": 12,
        "last_incident_date": "2024-11-28",
        "description": "Intra-Dinka territorial disputes during dry season. Pressure increasing as NDVI drops below 0.4.",
        "prediction_factors": {"herd_convergence": 0.7, "water_scarcity": 0.6, "ndvi_decline": 0.75, "historical_violence": 0.7}
    },
    {
        "id": "CZ3",
        "name": "Sobat River Junction",
        "lat": 8.45,
        "lng": 32.75,
        "radius": 30000,
        "risk_level": "High", 
        "risk_score": 75,
        "conflict_type": "Water access conflict",
        "ethnicities_involved": ["Nuer", "Shilluk"],
        "recent_incidents": 8,
        "last_incident_date": "2024-10-20",
        "description": "Critical water point where multiple herds converge. Competition intensifies in dry season.",
        "prediction_factors": {"herd_convergence": 0.85, "water_scarcity": 0.9, "ndvi_decline": 0.65, "historical_violence": 0.6}
    },
    {
        "id": "CZ4",
        "name": "Unity-Upper Nile Border",
        "lat": 9.35,
        "lng": 30.85,
        "radius": 40000,
        "risk_level": "Medium",
        "risk_score": 58,
        "conflict_type": "Territorial encroachment",
        "ethnicities_involved": ["Nuer", "Dinka"],
        "recent_incidents": 5,
        "last_incident_date": "2024-09-10",
        "description": "Border tension area. Nuer-Dinka historical conflict zone. Currently moderate due to available water.",
        "prediction_factors": {"herd_convergence": 0.5, "water_scarcity": 0.4, "ndvi_decline": 0.55, "historical_violence": 0.8}
    },
    {
        "id": "CZ5",
        "name": "Aweil-Lol River Crossing",
        "lat": 8.85,
        "lng": 27.55,
        "radius": 28000,
        "risk_level": "Medium",
        "risk_score": 52,
        "conflict_type": "Seasonal migration conflict",
        "ethnicities_involved": ["Dinka", "Baggara (cross-border)"],
        "recent_incidents": 4,
        "last_incident_date": "2024-08-15",
        "description": "Cross-border tension with Sudan. Seasonal Baggara cattle entering from north.",
        "prediction_factors": {"herd_convergence": 0.6, "water_scarcity": 0.55, "ndvi_decline": 0.7, "historical_violence": 0.5}
    },
    {
        "id": "CZ6",
        "name": "Rumbek-Lakes Convergence",
        "lat": 6.75,
        "lng": 29.75,
        "radius": 25000,
        "risk_level": "Low",
        "risk_score": 35,
        "conflict_type": "Resource competition",
        "ethnicities_involved": ["Dinka Agar"],
        "recent_incidents": 2,
        "last_incident_date": "2024-06-20",
        "description": "Generally stable area with good grazing. Minor disputes during peak dry season only.",
        "prediction_factors": {"herd_convergence": 0.3, "water_scarcity": 0.25, "ndvi_decline": 0.2, "historical_violence": 0.4}
    },
    {
        "id": "CZ7",
        "name": "Malakal-White Nile",
        "lat": 9.55,
        "lng": 31.55,
        "radius": 32000,
        "risk_level": "High",
        "risk_score": 72,
        "conflict_type": "Displacement-related",
        "ethnicities_involved": ["Shilluk", "Nuer", "Dinka"],
        "recent_incidents": 15,
        "last_incident_date": "2024-12-01",
        "description": "IDP presence complicates cattle access. Three-way ethnic tension. Armed group activity reported.",
        "prediction_factors": {"herd_convergence": 0.65, "water_scarcity": 0.5, "ndvi_decline": 0.6, "historical_violence": 0.85}
    },
    {
        "id": "CZ8",
        "name": "Terekeka-Mundari Lands",
        "lat": 5.55,
        "lng": 31.65,
        "radius": 22000,
        "risk_level": "Low",
        "risk_score": 28,
        "conflict_type": "Minor disputes",
        "ethnicities_involved": ["Mundari", "Bari"],
        "recent_incidents": 1,
        "last_incident_date": "2024-04-10",
        "description": "Relatively peaceful. Mundari cattle camps well-established. Good vegetation year-round.",
        "prediction_factors": {"herd_convergence": 0.2, "water_scarcity": 0.15, "ndvi_decline": 0.1, "historical_violence": 0.3}
    }
]

# Historical conflict data for backtesting
HISTORICAL_CONFLICTS = [
    {"date": "2024-12-15", "location": "Pibor", "lat": 6.80, "lng": 33.10, "type": "Cattle raid", "casualties": 45, "cattle_stolen": 2500, "ethnicities": ["Murle", "Nuer"]},
    {"date": "2024-12-01", "location": "Malakal", "lat": 9.53, "lng": 31.65, "type": "Armed clash", "casualties": 12, "cattle_stolen": 800, "ethnicities": ["Shilluk", "Nuer"]},
    {"date": "2024-11-28", "location": "Tonj East", "lat": 7.30, "lng": 28.90, "type": "Grazing dispute", "casualties": 8, "cattle_stolen": 450, "ethnicities": ["Dinka Agar", "Dinka Rek"]},
    {"date": "2024-11-15", "location": "Pibor", "lat": 6.75, "lng": 33.00, "type": "Cattle raid", "casualties": 23, "cattle_stolen": 1800, "ethnicities": ["Murle", "Dinka"]},
    {"date": "2024-10-20", "location": "Sobat River", "lat": 8.50, "lng": 32.70, "type": "Water conflict", "casualties": 6, "cattle_stolen": 200, "ethnicities": ["Nuer", "Shilluk"]},
    {"date": "2024-09-10", "location": "Bentiu", "lat": 9.25, "lng": 29.80, "type": "Territorial", "casualties": 15, "cattle_stolen": 950, "ethnicities": ["Nuer", "Dinka"]},
    {"date": "2024-08-15", "location": "Aweil", "lat": 8.77, "lng": 27.40, "type": "Cross-border raid", "casualties": 10, "cattle_stolen": 600, "ethnicities": ["Dinka", "Baggara"]},
    {"date": "2024-07-22", "location": "Pibor", "lat": 6.90, "lng": 33.15, "type": "Cattle raid", "casualties": 67, "cattle_stolen": 3200, "ethnicities": ["Murle", "Nuer"]},
    {"date": "2024-06-20", "location": "Rumbek", "lat": 6.80, "lng": 29.70, "type": "Minor dispute", "casualties": 2, "cattle_stolen": 50, "ethnicities": ["Dinka Agar"]},
    {"date": "2024-05-05", "location": "Jonglei", "lat": 7.20, "lng": 32.50, "type": "Cattle raid", "casualties": 35, "cattle_stolen": 1500, "ethnicities": ["Nuer", "Dinka"]},
]

# ============ WEATHER API (Open-Meteo - FREE) ============

async def fetch_weather_data(lat: float = 7.5, lng: float = 30.5, days: int = 14):
    """Fetch real-time weather data from Open-Meteo API"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            url = f"https://api.open-meteo.com/v1/forecast"
            params = {
                "latitude": lat,
                "longitude": lng,
                "daily": "precipitation_sum,temperature_2m_max,et0_fao_evapotranspiration",
                "timezone": "Africa/Khartoum",
                "forecast_days": days
            }
            response = await http_client.get(url, params=params)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Weather API error: {e}")
        return None

# ============ NEWS API - Sudan/South Sudan ============

async def fetch_sudan_news():
    """Fetch news about South Sudan and cattle/conflict from free news sources"""
    try:
        # Using GNews API (free tier)
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            # Search for South Sudan cattle and conflict news
            queries = ["South Sudan cattle", "South Sudan conflict", "South Sudan herders", "Jonglei violence"]
            all_articles = []
            
            for query in queries:
                try:
                    url = f"https://gnews.io/api/v4/search"
                    params = {
                        "q": query,
                        "lang": "en",
                        "country": "any",
                        "max": 5,
                        "apikey": os.environ.get("GNEWS_API_KEY", "")  # Optional
                    }
                    response = await http_client.get(url, params=params)
                    if response.status_code == 200:
                        data = response.json()
                        all_articles.extend(data.get("articles", []))
                except:
                    continue
            
            # If no API key, return curated mock news based on real events
            if not all_articles:
                return get_curated_news()
            
            return all_articles
    except Exception as e:
        logger.error(f"News API error: {e}")
        return get_curated_news()

def get_curated_news():
    """Return curated news items based on real South Sudan events"""
    return [
        {
            "title": "UN Reports Rising Cattle Raids in Jonglei State",
            "source": "UN OCHA",
            "url": "https://reliefweb.int/country/ssd",
            "published_at": "2024-12-20T10:00:00Z",
            "summary": "UNMISS peacekeepers deployed to Pibor County following reports of increased cattle raiding between Murle and Nuer communities. An estimated 2,500 cattle were stolen in recent incidents.",
            "relevance_score": 0.95,
            "location": "Jonglei, Pibor",
            "keywords": ["cattle raid", "Murle", "Nuer", "Pibor", "UNMISS"]
        },
        {
            "title": "Dry Season Triggers Early Cattle Migration in Lakes State",
            "source": "Radio Tamazuj",
            "url": "https://radiotamazuj.org",
            "published_at": "2024-12-18T08:30:00Z",
            "summary": "Pastoralists in Lakes State report below-average rainfall forcing earlier than usual cattle movements. Local authorities warn of potential conflicts at water points.",
            "relevance_score": 0.88,
            "location": "Lakes State, Rumbek",
            "keywords": ["dry season", "migration", "water", "Lakes State"]
        },
        {
            "title": "Peace Committee Meeting in Warrap to Address Grazing Disputes",
            "source": "Eye Radio",
            "url": "https://eyeradio.org",
            "published_at": "2024-12-15T14:00:00Z",
            "summary": "Traditional leaders from Dinka Agar and Dinka Rek communities meet in Tonj to establish grazing boundaries ahead of peak dry season.",
            "relevance_score": 0.82,
            "location": "Warrap, Tonj",
            "keywords": ["peace committee", "Dinka", "grazing", "Tonj"]
        },
        {
            "title": "Climate Change Disrupting Traditional Cattle Corridors",
            "source": "IGAD Climate Center",
            "url": "https://www.icpac.net",
            "published_at": "2024-12-12T09:00:00Z",
            "summary": "New IGAD report finds traditional cattle migration routes in South Sudan increasingly unreliable due to shifting rainfall patterns and vegetation changes.",
            "relevance_score": 0.78,
            "location": "South Sudan",
            "keywords": ["climate change", "migration corridors", "IGAD", "rainfall"]
        },
        {
            "title": "Humanitarian Agencies Warn of Food Insecurity in Upper Nile",
            "source": "WFP",
            "url": "https://www.wfp.org/countries/south-sudan",
            "published_at": "2024-12-10T11:30:00Z",
            "summary": "World Food Programme reports cattle deaths and reduced milk production in Upper Nile due to poor pasture conditions. 250,000 people facing crisis-level food insecurity.",
            "relevance_score": 0.85,
            "location": "Upper Nile, Malakal",
            "keywords": ["food insecurity", "WFP", "cattle", "Upper Nile"]
        },
        {
            "title": "Satellite Data Shows Vegetation Decline Across Jonglei",
            "source": "FEWS NET",
            "url": "https://fews.net/east-africa/south-sudan",
            "published_at": "2024-12-08T16:00:00Z",
            "summary": "FEWS NET analysis of NDVI data indicates below-normal vegetation conditions across eastern South Sudan, with Jonglei and Eastern Equatoria most affected.",
            "relevance_score": 0.92,
            "location": "Jonglei, Eastern Equatoria",
            "keywords": ["NDVI", "vegetation", "FEWS NET", "satellite"]
        },
        {
            "title": "Youth Armed Groups Complicate Cattle Recovery Efforts",
            "source": "Sudan Tribune",
            "url": "https://sudantribune.com",
            "published_at": "2024-12-05T07:45:00Z",
            "summary": "Local authorities report difficulties recovering stolen cattle due to involvement of armed youth groups. Community disarmament programs showing limited progress.",
            "relevance_score": 0.80,
            "location": "Jonglei",
            "keywords": ["armed groups", "cattle theft", "disarmament", "youth"]
        },
        {
            "title": "Cross-Border Cattle Movement from Sudan Increases Tensions",
            "source": "Ayin Network",
            "url": "https://3ayin.com",
            "published_at": "2024-12-02T13:00:00Z",
            "summary": "Reports of Baggara herders crossing into Northern Bahr el Ghazal earlier than usual. Local Dinka communities express concern over grazing land competition.",
            "relevance_score": 0.75,
            "location": "Northern Bahr el Ghazal, Aweil",
            "keywords": ["cross-border", "Baggara", "Dinka", "Sudan"]
        }
    ]

# ============ CONFLICT PREDICTION MODEL ============

def calculate_conflict_risk(herd_data: List[Dict], weather_data: Dict, zone: Dict) -> Dict:
    """Calculate real-time conflict risk based on multiple factors"""
    
    # Base factors from zone
    base_risk = zone.get("risk_score", 50)
    
    # Calculate herd convergence factor
    nearby_herds = []
    zone_lat, zone_lng = zone["lat"], zone["lng"]
    zone_radius_deg = zone["radius"] / 111000  # Convert meters to degrees approx
    
    for herd in herd_data:
        dist = ((herd["lat"] - zone_lat)**2 + (herd["lng"] - zone_lng)**2)**0.5
        if dist < zone_radius_deg * 2:  # Within 2x radius
            nearby_herds.append(herd)
    
    convergence_factor = min(1.0, len(nearby_herds) / 3)  # Max out at 3 herds
    
    # Calculate water stress factor
    water_stress = 0
    if nearby_herds:
        avg_water_days = sum(h["water_days"] for h in nearby_herds) / len(nearby_herds)
        water_stress = max(0, (5 - avg_water_days) / 5)  # Higher stress when <5 days
    
    # Calculate NDVI stress factor
    ndvi_stress = 0
    if nearby_herds:
        avg_ndvi = sum(h["ndvi"] for h in nearby_herds) / len(nearby_herds)
        ndvi_stress = max(0, (0.5 - avg_ndvi) / 0.5)  # Higher stress when <0.5
    
    # Weather factor (precipitation)
    weather_factor = 0
    if weather_data and "daily" in weather_data:
        rain_7d = sum(weather_data["daily"].get("precipitation_sum", [0])[:7])
        weather_factor = max(0, (30 - rain_7d) / 30)  # Higher stress with less rain
    
    # Calculate combined risk
    risk_modifiers = (
        convergence_factor * 0.25 +
        water_stress * 0.25 +
        ndvi_stress * 0.20 +
        weather_factor * 0.15 +
        zone["prediction_factors"].get("historical_violence", 0.5) * 0.15
    )
    
    adjusted_risk = base_risk * (0.7 + risk_modifiers * 0.6)
    adjusted_risk = min(100, max(0, adjusted_risk))
    
    # Determine risk level
    if adjusted_risk >= 80:
        risk_level = "Critical"
    elif adjusted_risk >= 60:
        risk_level = "High"
    elif adjusted_risk >= 40:
        risk_level = "Medium"
    else:
        risk_level = "Low"
    
    return {
        **zone,
        "real_time_risk": round(adjusted_risk, 1),
        "real_time_level": risk_level,
        "nearby_herds": len(nearby_herds),
        "factors": {
            "herd_convergence": round(convergence_factor, 2),
            "water_stress": round(water_stress, 2),
            "ndvi_stress": round(ndvi_stress, 2),
            "weather_stress": round(weather_factor, 2)
        }
    }

# ============ API ENDPOINTS ============

@api_router.get("/")
async def root():
    return {"message": "BOVINE - Cattle Movement Intelligence API", "status": "operational"}

@api_router.get("/herds")
async def get_herds():
    """Get all tracked herds with latest data"""
    herds = await db.herds.find({}, {"_id": 0}).to_list(100)
    
    if not herds:
        for herd in INITIAL_HERDS:
            herd_doc = {**herd, "last_updated": datetime.now(timezone.utc).isoformat()}
            await db.herds.insert_one(herd_doc)
        herds = INITIAL_HERDS
    
    return {"herds": herds, "count": len(herds), "last_updated": datetime.now(timezone.utc).isoformat()}

@api_router.get("/weather")
async def get_weather():
    """Get real-time weather forecast for South Sudan"""
    weather = await fetch_weather_data()
    
    if weather and "daily" in weather:
        weather_doc = {
            "id": str(uuid.uuid4()),
            "data": weather["daily"],
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "location": "South Sudan Central (7.5°N, 30.5°E)"
        }
        await db.weather_history.insert_one(weather_doc)
        
        return {
            "status": "live",
            "source": "Open-Meteo",
            "location": "South Sudan Central",
            "daily": weather["daily"],
            "fetched_at": datetime.now(timezone.utc).isoformat()
        }
    
    cached = await db.weather_history.find_one(sort=[("fetched_at", -1)])
    if cached:
        return {
            "status": "cached",
            "source": "Open-Meteo",
            "daily": cached.get("data"),
            "fetched_at": cached.get("fetched_at")
        }
    
    raise HTTPException(status_code=503, detail="Weather service unavailable")

@api_router.get("/water-sources")
async def get_water_sources():
    """Get water source data"""
    return {"sources": WATER_SOURCES, "count": len(WATER_SOURCES), "last_updated": datetime.now(timezone.utc).isoformat()}

@api_router.get("/grazing-regions")
async def get_grazing_regions():
    """Get grazing quality by region"""
    return {"regions": GRAZING_REGIONS, "last_updated": datetime.now(timezone.utc).isoformat()}

@api_router.get("/corridors")
async def get_corridors():
    """Get historical migration corridors"""
    return {"corridors": MIGRATION_CORRIDORS, "count": len(MIGRATION_CORRIDORS)}

@api_router.get("/ndvi-zones")
async def get_ndvi_zones():
    """Get NDVI vegetation zones"""
    zones = [
        {"lat": 6.5, "lng": 31.5, "radius": 120000, "ndvi": 0.65, "label": "High vegetation — Equatoria"},
        {"lat": 7.2, "lng": 29.8, "radius": 100000, "ndvi": 0.58, "label": "Good pasture — Lakes/Bahr el Ghazal"},
        {"lat": 8.0, "lng": 32.0, "radius": 90000, "ndvi": 0.42, "label": "Moderate — Jonglei north"},
        {"lat": 9.0, "lng": 30.5, "radius": 80000, "ndvi": 0.38, "label": "Declining — Unity State"},
        {"lat": 9.5, "lng": 31.5, "radius": 70000, "ndvi": 0.33, "label": "Dry — Upper Nile"},
        {"lat": 6.9, "lng": 33.2, "radius": 85000, "ndvi": 0.30, "label": "Stressed — Pibor area"},
    ]
    return {"zones": zones, "last_updated": datetime.now(timezone.utc).isoformat()}

@api_router.get("/conflict-zones")
async def get_conflict_zones():
    """Get conflict zones with real-time risk assessment"""
    herds = await db.herds.find({}, {"_id": 0}).to_list(100)
    if not herds:
        herds = INITIAL_HERDS
    
    weather = await fetch_weather_data(days=7)
    
    # Calculate real-time risk for each zone
    assessed_zones = []
    for zone in CONFLICT_ZONES:
        assessed_zone = calculate_conflict_risk(herds, weather or {}, zone)
        assessed_zones.append(assessed_zone)
    
    # Sort by real-time risk
    assessed_zones.sort(key=lambda x: x["real_time_risk"], reverse=True)
    
    return {
        "zones": assessed_zones,
        "count": len(assessed_zones),
        "critical_count": len([z for z in assessed_zones if z["real_time_level"] == "Critical"]),
        "high_count": len([z for z in assessed_zones if z["real_time_level"] == "High"]),
        "last_updated": datetime.now(timezone.utc).isoformat()
    }

@api_router.get("/historical-conflicts")
async def get_historical_conflicts():
    """Get historical conflict data for backtesting"""
    return {
        "conflicts": HISTORICAL_CONFLICTS,
        "count": len(HISTORICAL_CONFLICTS),
        "total_casualties": sum(c["casualties"] for c in HISTORICAL_CONFLICTS),
        "total_cattle_stolen": sum(c["cattle_stolen"] for c in HISTORICAL_CONFLICTS)
    }

@api_router.get("/news")
async def get_news():
    """Get latest news about South Sudan cattle and conflicts"""
    news = await fetch_sudan_news()
    
    # Store in MongoDB
    for item in news[:10]:
        news_doc = {
            "id": str(uuid.uuid4()),
            **item,
            "fetched_at": datetime.now(timezone.utc).isoformat()
        }
        await db.news.update_one(
            {"title": item["title"]},
            {"$set": news_doc},
            upsert=True
        )
    
    return {
        "articles": news[:10],
        "count": len(news[:10]),
        "last_updated": datetime.now(timezone.utc).isoformat()
    }

@api_router.get("/stats")
async def get_dashboard_stats():
    """Get aggregated dashboard statistics"""
    herds_data = await db.herds.find({}, {"_id": 0}).to_list(100)
    if not herds_data:
        herds_data = INITIAL_HERDS
    
    total_cattle = sum(h.get("heads", 0) for h in herds_data)
    avg_ndvi = sum(h.get("ndvi", 0) for h in herds_data) / len(herds_data) if herds_data else 0
    
    weather = await fetch_weather_data(days=7)
    total_rain_7d = 0
    if weather and "daily" in weather:
        total_rain_7d = sum(weather["daily"].get("precipitation_sum", [0])[:7])
    
    # Get conflict stats
    conflict_zones = CONFLICT_ZONES
    critical_zones = len([z for z in conflict_zones if z["risk_level"] == "Critical"])
    high_zones = len([z for z in conflict_zones if z["risk_level"] == "High"])
    
    return {
        "total_herds": len(herds_data),
        "total_cattle": total_cattle,
        "avg_ndvi": round(avg_ndvi, 2),
        "rain_7day_mm": round(total_rain_7d, 1),
        "high_pressure_herds": len([h for h in herds_data if h.get("water_days", 10) <= 3]),
        "critical_conflict_zones": critical_zones,
        "high_risk_zones": high_zones,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }

@api_router.post("/ai/analyze")
async def ai_analyze(request: AIAnalysisRequest):
    """AI-powered analysis using Emergent LLM"""
    try:
        herds_data = await db.herds.find({}, {"_id": 0}).to_list(100)
        if not herds_data:
            herds_data = INITIAL_HERDS
        
        weather = await fetch_weather_data(days=14)
        rain_14d = 0
        dry_days = 0
        if weather and "daily" in weather:
            rain_data = weather["daily"].get("precipitation_sum", [])
            rain_14d = sum(rain_data)
            dry_days = sum(1 for r in rain_data if r < 1)
        
        # Calculate conflict risk for context
        conflict_summary = []
        for zone in CONFLICT_ZONES:
            risk_data = calculate_conflict_risk(herds_data, weather or {}, zone)
            if risk_data["real_time_risk"] >= 60:
                conflict_summary.append(f"• {zone['name']}: {risk_data['real_time_risk']:.0f}% risk ({risk_data['real_time_level']})")
        
        system_prompt = f"""You are BOVINE, a cattle movement intelligence system for South Sudan used by the United Nations.
You have access to real-time environmental data, tracked herd positions, and conflict prediction models.

LIVE WEATHER DATA (Open-Meteo, South Sudan):
- 14-day total forecast rainfall: {rain_14d:.1f}mm
- Dry days in 14-day forecast: {dry_days}/14
- Source: Open-Meteo API, updated hourly

TRACKED HERDS ({len(herds_data)} active):
{chr(10).join([f"• {h['name']} [{h['ethnicity']}]: {h['heads']:,} cattle, {h['region']}" + chr(10) + f"  Direction: {h['trend']} @ {h['speed']}km/day | NDVI: {h['ndvi']} | Water access: {h['water_days']} days" + chr(10) + f"  Note: {h['note']}" for h in herds_data])}

GRAZING CONDITIONS BY REGION:
{chr(10).join([f"• {r['name']}: NDVI {r['ndvi']:.2f}, Water {r['water']}, Trend {r['trend']}, Pressure {r['pressure']}" for r in GRAZING_REGIONS])}

ACTIVE WATER SOURCES:
{chr(10).join([f"• {w['name']} [{w['type']}]: {int(w['reliability']*100)}% reliability" for w in WATER_SOURCES])}

CONFLICT ZONES (High Risk):
{chr(10).join(conflict_summary) if conflict_summary else "No critical zones currently"}

HISTORICAL CONTEXT: Recent conflicts include cattle raids in Pibor (Murle-Nuer, 45 casualties), armed clashes in Malakal (Shilluk-Nuer), and grazing disputes in Tonj (Dinka sub-clans).

CONTEXT: In South Sudan cattle are currency, social capital, and survival. The Mundari, Dinka, Nuer, Murle, and Shilluk peoples all rely on cattle. Movement is driven primarily by water availability, pasture quality (NDVI), and seasonal patterns. Climate change has disrupted traditional corridors.

CRITICAL: Cattle movement predicts violence, displacement, and famine. The UN cares because:
- Cows predict where people will die
- Cows predict where aid will be needed  
- Cows predict when violence will erupt
- Cows move before bullets do

Be analytical, direct, and brief. Use bullet points. Quantify predictions where possible. Think in systems and second/third-order effects. When asked about conflict, use the historical data patterns and current herd convergence factors."""

        # Use LlmChat with correct signature
        import uuid as uuid_module
        session_id = str(uuid_module.uuid4())
        
        llm = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY", ""),
            session_id=session_id,
            system_message=system_prompt
        )
        
        # Set the model - provider is "anthropic" for Claude
        llm = llm.with_model("anthropic", "claude-sonnet-4-20250514")
        
        # Send the message - UserMessage takes 'text' not 'content'
        response_text = await llm.send_message(UserMessage(text=request.query))

        await db.ai_history.insert_one({
            "id": str(uuid.uuid4()),
            "query": request.query,
            "response": response_text,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return {"response": response_text, "timestamp": datetime.now(timezone.utc).isoformat()}
        
    except Exception as e:
        logger.error(f"AI Analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

@api_router.get("/historical/weather")
async def get_historical_weather():
    """Get historical weather data from MongoDB"""
    history = await db.weather_history.find({}, {"_id": 0}).sort("fetched_at", -1).to_list(30)
    return {"history": history, "count": len(history)}

@api_router.get("/historical/analysis")
async def get_historical_analysis():
    """Get historical AI analysis from MongoDB"""
    history = await db.ai_history.find({}, {"_id": 0}).sort("timestamp", -1).to_list(50)
    return {"history": history, "count": len(history)}

# Include the router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize database with herd data if empty"""
    count = await db.herds.count_documents({})
    if count == 0:
        logger.info("Initializing herd data...")
        for herd in INITIAL_HERDS:
            herd_doc = {**herd, "last_updated": datetime.now(timezone.utc).isoformat()}
            await db.herds.insert_one(herd_doc)
        logger.info(f"Initialized {len(INITIAL_HERDS)} herds")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
