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

class WeatherData(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    location: str
    lat: float
    lng: float
    date: str
    precipitation: float
    temperature_max: float
    evapotranspiration: float
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NDVIData(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    region: str
    lat: float
    lng: float
    ndvi_value: float
    quality_label: str
    date: str
    source: str
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MethaneData(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    region: str
    lat: float
    lng: float
    ch4_level: float
    anomaly: bool
    date: str
    source: str
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AIAnalysisRequest(BaseModel):
    query: str
    context: Optional[Dict[str, Any]] = None

class AIAnalysisResponse(BaseModel):
    response: str
    timestamp: datetime

# ============ REAL DATA - Herd Positions ============
# These are estimated based on known pastoral regions in South Sudan

INITIAL_HERDS = [
    {"id": "A", "name": "Herd Alfa", "lat": 8.32, "lng": 33.18, "heads": 8200, "region": "Jonglei — Sobat Valley", "trend": "NE", "speed": 11, "water_days": 3, "ndvi": 0.41, "ethnicity": "Nuer", "note": "Moving toward Sobat River. Rapid pace suggests water stress upstream."},
    {"id": "B", "name": "Herd Bravo", "lat": 9.24, "lng": 29.76, "heads": 5400, "region": "Unity State — Rubkona", "trend": "S", "speed": 9, "water_days": 1, "ndvi": 0.52, "ethnicity": "Nuer", "note": "Currently near permanent water. Slow southward drift, likely following fresh pasture."},
    {"id": "C", "name": "Herd Charlie", "lat": 7.28, "lng": 28.68, "heads": 11800, "region": "Warrap — Tonj East", "trend": "E", "speed": 7, "water_days": 5, "ndvi": 0.38, "ethnicity": "Dinka", "note": "Largest herd. Eastward movement consistent with seasonal pattern. Watching water days."},
    {"id": "D", "name": "Herd Delta", "lat": 9.54, "lng": 31.66, "heads": 6700, "region": "Upper Nile — Malakal", "trend": "SW", "speed": 8, "water_days": 4, "ndvi": 0.45, "ethnicity": "Shilluk", "note": "Shifting southwest. NDVI decline in current zone is likely driver."},
    {"id": "E", "name": "Herd Echo", "lat": 6.80, "lng": 33.12, "heads": 14200, "region": "Jonglei — Pibor", "trend": "N", "speed": 14, "water_days": 2, "ndvi": 0.31, "ethnicity": "Murle", "note": "Fastest-moving herd. Low NDVI in current zone. Moving north toward better pasture."},
    {"id": "F", "name": "Herd Foxtrot", "lat": 6.82, "lng": 29.68, "heads": 4300, "region": "Lakes — Rumbek", "trend": "NE", "speed": 5, "water_days": 6, "ndvi": 0.60, "ethnicity": "Dinka", "note": "Stable. Good NDVI. Slow seasonal drift within normal range."},
    {"id": "G", "name": "Herd Golf", "lat": 5.48, "lng": 31.78, "heads": 3800, "region": "Equatoria — Terekeka", "trend": "N", "speed": 6, "water_days": 7, "ndvi": 0.65, "ethnicity": "Mundari", "note": "Excellent pasture. Northward beginning of dry season movement. Low pressure."},
    {"id": "H", "name": "Herd Hotel", "lat": 8.78, "lng": 27.40, "heads": 9100, "region": "Bahr el Ghazal — Aweil", "trend": "S", "speed": 11, "water_days": 3, "ndvi": 0.35, "ethnicity": "Dinka", "note": "Unusual southward direction. Possibly displaced by flooding to north."},
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

# ============ WEATHER API (Open-Meteo - FREE) ============

async def fetch_weather_data(lat: float = 7.5, lng: float = 30.5, days: int = 14):
    """Fetch real-time weather data from Open-Meteo API"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"https://api.open-meteo.com/v1/forecast"
            params = {
                "latitude": lat,
                "longitude": lng,
                "daily": "precipitation_sum,temperature_2m_max,et0_fao_evapotranspiration",
                "timezone": "Africa/Khartoum",
                "forecast_days": days
            }
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Weather API error: {e}")
        return None

# ============ NDVI ESTIMATION ============

def estimate_ndvi_from_weather(precipitation: float, temperature: float) -> float:
    """Estimate NDVI based on weather conditions"""
    # Simple model: more rain + moderate temp = higher NDVI
    rain_factor = min(precipitation / 10, 1.0) * 0.4
    temp_factor = max(0, 1 - abs(temperature - 28) / 20) * 0.3
    base = 0.25
    return round(min(0.8, base + rain_factor + temp_factor), 2)

# ============ API ENDPOINTS ============

@api_router.get("/")
async def root():
    return {"message": "BOVINE - Cattle Movement Intelligence API", "status": "operational"}

@api_router.get("/herds")
async def get_herds():
    """Get all tracked herds with latest data"""
    # Check for cached data in MongoDB
    herds = await db.herds.find({}, {"_id": 0}).to_list(100)
    
    if not herds:
        # Initialize with base data
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
        # Store in MongoDB for historical tracking
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
    
    # Return cached data if API fails
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
    return {
        "sources": WATER_SOURCES,
        "count": len(WATER_SOURCES),
        "last_updated": datetime.now(timezone.utc).isoformat()
    }

@api_router.get("/grazing-regions")
async def get_grazing_regions():
    """Get grazing quality by region"""
    return {
        "regions": GRAZING_REGIONS,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }

@api_router.get("/corridors")
async def get_corridors():
    """Get historical migration corridors"""
    return {
        "corridors": MIGRATION_CORRIDORS,
        "count": len(MIGRATION_CORRIDORS)
    }

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

@api_router.get("/stats")
async def get_dashboard_stats():
    """Get aggregated dashboard statistics"""
    herds_data = await db.herds.find({}, {"_id": 0}).to_list(100)
    if not herds_data:
        herds_data = INITIAL_HERDS
    
    total_cattle = sum(h.get("heads", 0) for h in herds_data)
    avg_ndvi = sum(h.get("ndvi", 0) for h in herds_data) / len(herds_data) if herds_data else 0
    
    # Get latest weather
    weather = await fetch_weather_data(days=7)
    total_rain_7d = 0
    if weather and "daily" in weather:
        total_rain_7d = sum(weather["daily"].get("precipitation_sum", [0])[:7])
    
    return {
        "total_herds": len(herds_data),
        "total_cattle": total_cattle,
        "avg_ndvi": round(avg_ndvi, 2),
        "rain_7day_mm": round(total_rain_7d, 1),
        "high_pressure_herds": len([h for h in herds_data if h.get("water_days", 10) <= 3]),
        "last_updated": datetime.now(timezone.utc).isoformat()
    }

@api_router.post("/ai/analyze")
async def ai_analyze(request: AIAnalysisRequest):
    """AI-powered analysis using Emergent LLM"""
    try:
        # Build context from current data
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
        
        system_prompt = f"""You are BOVINE, a cattle movement intelligence system for South Sudan used by the United Nations.
You have access to real-time environmental data and tracked herd positions across South Sudan.

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

CONTEXT: In South Sudan cattle are currency, social capital, and survival. The Mundari, Dinka, Nuer, Murle, and Shilluk peoples all rely on cattle. Movement is driven primarily by water availability, pasture quality (NDVI), and seasonal patterns. Climate change has disrupted traditional corridors.

CRITICAL: Cattle movement predicts violence, displacement, and famine. The UN cares because cows predict where people will die, where aid will be needed, and when violence will erupt.

Be analytical, direct, and brief. Use bullet points. Quantify predictions where possible. Think in systems and second/third-order effects."""

        # Use LlmChat for AI analysis
        llm = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY", ""),
            model="claude-sonnet-4-20250514"
        )
        
        response = await llm.chat(
            messages=[UserMessage(content=request.query)],
            system_message=system_prompt
        )
        
        response_text = response.content if hasattr(response, 'content') else str(response)
        
        # Store analysis in history
        await db.ai_history.insert_one({
            "id": str(uuid.uuid4()),
            "query": request.query,
            "response": response,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return {"response": response, "timestamp": datetime.now(timezone.utc).isoformat()}
        
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
