import argparse
import json
import logging
import os
import sys
import time
import pandas as pd

# Add backend directory to sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, BACKEND_DIR)

from app.analytics.osm_client import geocode_locality, fetch_osm_counts
from app.analytics.scoring import normalize_features, calculate_quality_score, FEATURE_KEYS
from app.analytics.clustering import run_clustering
from app.db.database import SessionLocal, engine, Base
from app.models.locality import Locality

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("fetch_osm_data")

SEED_FILE = os.path.join(BACKEND_DIR, "data", "localities_seed.json")
SNAPSHOT_FILE = os.path.join(BACKEND_DIR, "data", "osm_seed_snapshot.json")


def fetch_all_seed_localities(force_refresh: bool = False):
    """
    Fetch genuine OpenStreetMap counts for all 30 seed localities.
    Caches the results to a snapshot JSON to guarantee fast offline restarts.
    """
    with open(SEED_FILE, "r", encoding="utf-8") as f:
        seed_list = json.load(f)

    existing_map = {}
    if os.path.exists(SNAPSHOT_FILE) and not force_refresh:
        try:
            with open(SNAPSHOT_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
                # Keep only valid non-zero items
                existing_map = {item["name"].lower(): item for item in saved if item.get("transit_count", 0) > 0 or item.get("amenity_count", 0) > 0}
                if len(existing_map) == len(seed_list):
                    logger.info(f"All {len(seed_list)} localities already cached in {SNAPSHOT_FILE}.")
                    return list(existing_map.values())
        except Exception as err:
            logger.warning(f"Snapshot read error: {err}")
            existing_map = {}

    results = []
    total = len(seed_list)
    logger.info(f"Beginning real Overpass API & Nominatim extraction for {total} localities...")

    for idx, item in enumerate(seed_list, start=1):
        name = item["name"]
        city = item["city"]
        state = item.get("state", "")

        # Resume from checkpoint if already fetched
        if name.lower() in existing_map:
            logger.info(f"[{idx}/{total}] Using cached data for {name}, {city}")
            results.append(existing_map[name.lower()])
            continue

        logger.info(f"[{idx}/{total}] Geocoding {name}, {city}...")
        geo = geocode_locality(name, city)
        if not geo:
            logger.warning(f"Failed to geocode {name}, using city fallback")
            geo = {"latitude": 28.6139, "longitude": 77.2090, "city": city, "state": state}

        lat = geo["latitude"]
        lon = geo["longitude"]
        logger.info(f"[{idx}/{total}] Querying Overpass within 1.5km for {name} ({lat:.4f}, {lon:.4f})...")

        counts = fetch_osm_counts(lat, lon, radius=1500, delay=1.0)
        logger.info(
            f"   -> Transit (deduped): {counts['transit_count']}, "
            f"Healthcare: {counts['healthcare_count']}, "
            f"Education: {counts['education_count']}, "
            f"Green: {counts['green_space_count']}, "
            f"Amenities: {counts['amenity_count']}, "
            f"Police: {counts['safety_proxy_count']}"
        )

        record = {
            "name": name,
            "city": city,
            "district": geo.get("district") or city,
            "state": state or geo.get("state", ""),
            "pincode": geo.get("pincode"),
            "latitude": lat,
            "longitude": lon,
            "healthcare_count": counts["healthcare_count"],
            "education_count": counts["education_count"],
            "green_space_count": counts["green_space_count"],
            "transit_count": counts["transit_count"],
            "amenity_count": counts["amenity_count"],
            "safety_proxy_count": counts["safety_proxy_count"],
            "aqi": None,
            "is_seed": True,
        }
        results.append(record)

        # Progressive checkpoint save after each locality
        with open(SNAPSHOT_FILE, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2)

    return results


def seed_database(records: list):
    """
    Populate SQLite database with records, compute normalized scores,
    quality scores, and KMeans clusters (k=4), then commit.
    """
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)

    # Convert to DataFrame for analytics engine
    df = pd.DataFrame(records)
    # If ID not yet in df, assign sequential 1..N
    df["id"] = range(1, len(df) + 1)

    # 1. Normalization
    logger.info("Normalizing counts to 0-100 scale...")
    df = normalize_features(df)

    # 2. Quality Score calculation
    logger.info("Computing weighted composite quality scores...")
    quality_scores = []
    for _, row in df.iterrows():
        row_scores = {f"{feat}_score": row[f"{feat}_score"] for feat in FEATURE_KEYS}
        qs = calculate_quality_score(row_scores)
        quality_scores.append(qs)
    df["quality_score"] = quality_scores

    # 3. Clustering (KMeans k=4 + PCA)
    logger.info("Running KMeans clustering and archetype labeling...")
    df, cluster_insights = run_clustering(df)

    # 4. Insert or update SQLite records
    db = SessionLocal()
    try:
        # Clear existing seed records if re-seeding
        db.query(Locality).filter(Locality.is_seed == True).delete()
        db.commit()

        for _, row in df.iterrows():
            loc = Locality(
                name=row["name"],
                city=row["city"],
                district=str(row["district"]) if pd.notna(row.get("district")) else str(row["city"]),
                state=row["state"],
                pincode=str(row["pincode"]) if pd.notna(row.get("pincode")) else None,
                latitude=float(row["latitude"]),
                longitude=float(row["longitude"]),
                healthcare_count=int(row["healthcare_count"]),
                education_count=int(row["education_count"]),
                green_space_count=int(row["green_space_count"]),
                transit_count=int(row["transit_count"]),
                amenity_count=int(row["amenity_count"]),
                safety_proxy_count=int(row["safety_proxy_count"]),
                aqi=None,
                healthcare_score=float(row["healthcare_score"]),
                education_score=float(row["education_score"]),
                green_space_score=float(row["green_space_score"]),
                transit_score=float(row["transit_score"]),
                amenity_score=float(row["amenity_score"]),
                safety_proxy_score=float(row["safety_proxy_score"]),
                quality_score=float(row["quality_score"]),
                cluster_id=int(row["cluster_id"]),
                cluster_label=str(row["cluster_label"]),
                cluster_description=str(row["cluster_description"]),
                is_seed=True,
            )
            db.add(loc)
        db.commit()
        logger.info(f"Successfully seeded {len(df)} localities into SQLite database!")
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Fetch real OSM data and seed NeighborhoodIQ DB")
    parser.add_argument("--refresh", action="store_true", help="Force re-query of Overpass and Nominatim APIs")
    args = parser.parse_args()

    records = fetch_all_seed_localities(force_refresh=args.refresh)
    seed_database(records)


if __name__ == "__main__":
    main()
