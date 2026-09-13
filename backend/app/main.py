import json
import logging
import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure backend root is on sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.db.database import engine, Base, SessionLocal
from app.models.locality import Locality
from app.routes import localities, scoring, insights, geo

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("neighborhoodiq")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup & shutdown events:
    Ensures SQLite schema exists and auto-seeds database from snapshot if empty.
    """
    logger.info("Initializing SQLite database tables...")
    Base.metadata.create_all(bind=engine)

    # Automatic schema migration check
    with engine.connect() as conn:
        from sqlalchemy import text
        existing_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(localities)")).fetchall()]
        if "pincode" not in existing_cols:
            logger.info("Migrating schema: Adding 'pincode' column to localities table...")
            conn.execute(text("ALTER TABLE localities ADD COLUMN pincode VARCHAR(10)"))
            conn.commit()
        if "district" not in existing_cols:
            logger.info("Migrating schema: Adding 'district' column to localities table...")
            conn.execute(text("ALTER TABLE localities ADD COLUMN district VARCHAR(100)"))
            conn.commit()

    # Check if database is empty; if so, populate from snapshot
    db = SessionLocal()
    try:
        count = db.query(Locality).count()
        logger.info(f"Existing localities in DB: {count}")
        if count == 0:
            snapshot_path = os.path.join(BASE_DIR, "data", "osm_seed_snapshot.json")
            if os.path.exists(snapshot_path):
                logger.info(f"Database empty. Seeding from {snapshot_path}...")
                from scripts.fetch_osm_data import seed_database
                with open(snapshot_path, "r", encoding="utf-8") as f:
                    records = json.load(f)
                seed_database(records)
                logger.info("Database auto-seeding completed.")
            else:
                logger.warning("No snapshot found. Run `python scripts/fetch_osm_data.py` to seed data.")
    except Exception as e:
        logger.error(f"Startup database check error: {e}")
    finally:
        db.close()

    yield
    logger.info("NeighborhoodIQ server shutting down.")


app = FastAPI(
    title="NeighborhoodIQ API",
    description="Data analytics platform scoring and comparing residential localities on livability using real OpenStreetMap data.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(localities.router)
app.include_router(scoring.router)
app.include_router(insights.router)
app.include_router(geo.router)


@app.get("/")
def root():
    return {
        "app": "NeighborhoodIQ",
        "description": "Urban livability scoring platform powered by real OpenStreetMap data",
        "version": "1.0.0",
        "endpoints": {
            "localities": "/localities",
            "lookup": "/localities/lookup?query={place_name}",
            "compare": "/compare?ids={id1},{id2}",
            "recalculate_score": "/score/recalculate",
            "correlation": "/insights/correlation",
            "clusters": "/insights/clusters",
            "leaderboard": "/insights/leaderboard",
            "eda": "/insights/eda"
        }
    }
