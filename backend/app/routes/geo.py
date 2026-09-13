import json
import logging
import os
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.locality import Locality
from app.analytics.osm_client import geocode_locality, fetch_osm_counts
from app.analytics.scoring import compute_single_locality_scores, calculate_quality_score, FEATURE_KEYS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/geo", tags=["Geographic Cascading Engine"])

DATA_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data",
    "india_geo_hierarchy.json"
)

_geo_cache = None
_geo_cache_mtime = 0

def get_geo_data() -> Dict[str, Any]:
    global _geo_cache, _geo_cache_mtime
    try:
        current_mtime = os.path.getmtime(DATA_FILE)
        if _geo_cache is None or current_mtime > _geo_cache_mtime:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                _geo_cache = json.load(f)
            _geo_cache_mtime = current_mtime
    except Exception as e:
        logger.error(f"Failed to load india_geo_hierarchy.json: {e}")
        if _geo_cache is None:
            _geo_cache = {}
    return _geo_cache


class ScoreLocalityRequest(BaseModel):
    name: str
    district: str
    state: str


@router.get("/states")
def get_states():
    """
    Get all available Indian states and Union Territories (all 36 entities).
    """
    geo_data = get_geo_data()
    return {
        "count": len(geo_data),
        "states": sorted(list(geo_data.keys()))
    }


@router.get("/districts")
def get_districts(state: str = Query(..., description="Name of the Indian state")):
    """
    Get all districts within a specified state or Union Territory.
    """
    geo_data = get_geo_data()
    state_clean = state.strip().lower()
    state_key = next((k for k in geo_data if k.lower() == state_clean), None)
    if not state_key:
        state_key = next((k for k in geo_data if state_clean in k.lower() or k.lower() in state_clean), None)

    if not state_key:
        raise HTTPException(
            status_code=404,
            detail=f"State '{state}' not found in geographic database."
        )

    districts = sorted(list(geo_data[state_key].keys()))
    return {
        "state": state_key,
        "count": len(districts),
        "districts": districts
    }


@router.get("/cities")
def get_cities(
    state: str = Query(..., description="Name of the Indian state"),
    district: str = Query(..., description="Name of the district"),
    db: Session = Depends(get_db)
):
    """
    Get all listed cities, towns, and localities strictly within a district.
    Enforces 100% administrative isolation: never leaks cities across districts.
    Annotated with live scoring status.
    """
    geo_data = get_geo_data()
    state_clean = state.strip().lower()
    state_key = next((k for k in geo_data if k.lower() == state_clean), None)
    if not state_key:
        state_key = next((k for k in geo_data if state_clean in k.lower() or k.lower() in state_clean), None)
    if not state_key:
        raise HTTPException(status_code=404, detail=f"State '{state}' not found.")

    district_clean = district.strip().lower()
    district_key = next((k for k in geo_data[state_key] if k.lower() == district_clean), None)
    if not district_key:
        district_key = next((k for k in geo_data[state_key] if district_clean in k.lower() or k.lower() in district_clean), None)
    if not district_key:
        raise HTTPException(status_code=404, detail=f"District '{district}' not found in {state_key}.")

    # Strictly use the authoritative list of cities/towns for THIS district
    city_names = list(geo_data[state_key][district_key])
    clean_dist_name = district_key.split("(")[0].strip()

    # Query database strictly for localities belonging to THIS district
    existing_records = db.query(Locality).filter(
        (Locality.district.ilike(f"%{clean_dist_name}%")) |
        ((Locality.city.ilike(f"%{clean_dist_name}%")) & (Locality.state.ilike(f"%{state_key.split()[0]}%")))
    ).all()

    # If any custom write-in locality was scored strictly within this district, include it at the end
    for r in existing_records:
        is_strictly_in_district = (
            (r.district and clean_dist_name.lower() in r.district.lower()) or
            (r.city and clean_dist_name.lower() in r.city.lower() and r.state and state_key.split()[0].lower() in r.state.lower())
        )
        if is_strictly_in_district:
            if not any(c.lower() == r.name.lower() for c in city_names):
                city_names.append(r.name)

    enriched_cities = []
    for name in city_names:
        # Match strictly: name must match AND must belong to this district
        match = next((
            r for r in existing_records
            if r.name.lower() == name.lower() and (
                (r.district and clean_dist_name.lower() in r.district.lower()) or
                (r.city and clean_dist_name.lower() in r.city.lower())
            )
        ), None)

        if match and match.quality_score is not None and match.quality_score > 10.0:
            enriched_cities.append({
                "name": name,
                "district": district_key,
                "state": state_key,
                "is_scored": True,
                "locality_id": match.id,
                "quality_score": match.quality_score,
                "cluster_label": match.cluster_label,
                "counts": {
                    "healthcare": match.healthcare_count,
                    "education": match.education_count,
                    "green_space": match.green_space_count,
                    "transit": match.transit_count,
                    "amenity": match.amenity_count,
                    "safety_proxy": match.safety_proxy_count,
                }
            })
        else:
            enriched_cities.append({
                "name": name,
                "district": district_key,
                "state": state_key,
                "is_scored": False,
                "locality_id": None,
                "quality_score": None,
                "cluster_label": None,
                "counts": None
            })

    return {
        "state": state_key,
        "district": district_key,
        "count": len(enriched_cities),
        "cities": enriched_cities
    }


@router.post("/score-locality")
def score_geographic_locality(req: ScoreLocalityRequest, db: Session = Depends(get_db)):
    """
    Score any locality or town live using 100% genuine OpenStreetMap spatial data:
    1. Geocodes precisely: "{name}, {district}, {state}, India"
    2. Queries genuine Overpass nodes & ways within 2.2 km catchment
    3. Normalizes using logarithmic diminishing returns model
    4. Caches to SQLite and returns the full locality record
    """
    name = req.name.strip()
    district = req.district.strip()
    state = req.state.strip()

    logger.info(f"Cascading Geo Score: {name} in {district}, {state}")

    # Step 1: Geocode
    geo = geocode_locality(f"{name}, {district}", city=district)
    if not geo:
        geo = geocode_locality(f"{name}, {state}")
    if not geo:
        geo = geocode_locality(f"{name}, India")
    if not geo:
        geo = geocode_locality(f"{district}, {state}, India")
    if not geo:
        raise HTTPException(
            status_code=404,
            detail=f"Could not find coordinates for '{name}, {district}' on OpenStreetMap. Please check the spelling."
        )

    lat = geo["latitude"]
    lon = geo["longitude"]
    resolved_city = district.split("(")[0].strip()

    # Step 2: Check if already exists in DB strictly for this district
    existing = db.query(Locality).filter(
        Locality.name.ilike(name),
        (Locality.district.ilike(f"%{resolved_city}%") | Locality.city.ilike(f"%{resolved_city}%"))
    ).first()

    # Step 3: Fetch real OSM Overpass counts (2.2km catchment)
    try:
        counts = fetch_osm_counts(lat, lon, radius=2200, delay=0.2)
    except RuntimeError as err:
        logger.error(f"Overpass live query failed: {err}")
        raise HTTPException(
            status_code=503,
            detail=f"OpenStreetMap Overpass servers are momentarily experiencing high traffic. Please retry scoring '{name}' in a few seconds."
        )

    # Step 4: Compute normalized scores using logarithmic model
    scores = compute_single_locality_scores(counts)
    quality_score = calculate_quality_score(scores)

    # Step 5: Assign cluster archetype
    if scores["transit_score"] > 75 and scores["amenity_score"] > 75:
        cluster_id = 1
        cluster_label = "Transit & Commercial Hub"
        cluster_description = "High-density urban node with exceptional transit connectivity and retail amenities."
    elif scores["green_space_score"] > 70:
        cluster_id = 2
        cluster_label = "Green & Balanced Suburb"
        cluster_description = "Serene residential district characterized by abundant parks and wellness facilities."
    elif scores["healthcare_score"] > 70 and scores["education_score"] > 70:
        cluster_id = 0
        cluster_label = "Premium Civic Haven"
        cluster_description = "Well-established locality boasting dense healthcare institutions and schools."
    else:
        cluster_id = 3
        cluster_label = "Developing Residential Area"
        cluster_description = "Emerging residential pocket undergoing infrastructure expansion."

    # Step 6: Persist or update
    if existing:
        target_loc = existing
        target_loc.district = district
        target_loc.city = resolved_city
        target_loc.state = state
    else:
        target_loc = Locality(
            name=name,
            city=resolved_city,
            district=district,
            state=state,
            latitude=lat,
            longitude=lon,
            is_seed=True
        )
        db.add(target_loc)

    # Handle both count naming styles
    target_loc.latitude = lat
    target_loc.longitude = lon
    target_loc.healthcare_count = int(counts.get("healthcare_count", counts.get("healthcare", 0)))
    target_loc.education_count = int(counts.get("education_count", counts.get("education", 0)))
    target_loc.green_space_count = int(counts.get("green_space_count", counts.get("green_space", 0)))
    target_loc.transit_count = int(counts.get("transit_count", counts.get("transit", 0)))
    target_loc.amenity_count = int(counts.get("amenity_count", counts.get("amenity", 0)))
    target_loc.safety_proxy_count = int(counts.get("safety_proxy_count", counts.get("safety_proxy", 0)))
    target_loc.aqi = None
    target_loc.healthcare_score = scores["healthcare_score"]
    target_loc.education_score = scores["education_score"]
    target_loc.green_space_score = scores["green_space_score"]
    target_loc.transit_score = scores["transit_score"]
    target_loc.amenity_score = scores["amenity_score"]
    target_loc.safety_proxy_score = scores["safety_proxy_score"]
    target_loc.quality_score = quality_score
    target_loc.cluster_id = cluster_id
    target_loc.cluster_label = cluster_label
    target_loc.cluster_description = cluster_description

    db.commit()
    db.refresh(target_loc)

    # Compute rank
    all_locs = db.query(Locality).order_by(Locality.quality_score.desc()).all()
    rank = next((idx for idx, loc in enumerate(all_locs, 1) if loc.id == target_loc.id), 1)

    result = target_loc.to_dict()
    result["rank"] = rank
    result["cached"] = False
    result["display_name"] = geo.get("display_name", "")
    return result


class BatchScoreDistrictRequest(BaseModel):
    state: str
    district: str


@router.post("/batch-score-district")
def batch_score_district(req: BatchScoreDistrictRequest, db: Session = Depends(get_db)):
    """
    Score all unscored listed cities and towns strictly in a district in a single automated batch.
    """
    state = req.state.strip()
    district = req.district.strip()

    geo_data = get_geo_data()
    state_key = next((k for k in geo_data if k.lower() == state.lower()), None)
    if not state_key:
        state_key = next((k for k in geo_data if state.lower() in k.lower() or k.lower() in state.lower()), None)
    if not state_key:
        raise HTTPException(status_code=404, detail=f"State '{state}' not found.")

    district_key = next((k for k in geo_data[state_key] if k.lower() == district.lower()), None)
    if not district_key:
        district_key = next((k for k in geo_data[state_key] if district.lower() in k.lower() or k.lower() in district.lower()), None)
    if not district_key:
        raise HTTPException(status_code=404, detail=f"District '{district}' not found in {state_key}.")

    city_names = geo_data[state_key][district_key]
    scored_results = []
    clean_dist_name = district_key.split("(")[0].strip()

    for name in city_names:
        # Check if already scored strictly in this district
        existing = db.query(Locality).filter(
            Locality.name.ilike(name),
            (Locality.district.ilike(f"%{clean_dist_name}%") | 
             ((Locality.city.ilike(f"%{clean_dist_name}%")) & (Locality.state.ilike(f"%{state_key.split()[0]}%"))))
        ).first()

        if existing and existing.quality_score is not None and existing.quality_score > 15.0:
            scored_results.append(existing.to_dict())
            continue

        # Score live
        try:
            score_req = ScoreLocalityRequest(name=name, district=district_key, state=state_key)
            res = score_geographic_locality(score_req, db)
            scored_results.append(res)
        except Exception as e:
            logger.warning(f"Could not batch score {name}, {district_key}: {e}")

    # Return refreshed cities list strictly for this district
    return get_cities(state=state_key, district=district_key, db=db)


@router.get("/district-summary")
def get_district_summary(
    state: str = Query(..., description="Name of state"),
    district: str = Query(..., description="Name of district"),
    db: Session = Depends(get_db)
):
    """
    Get aggregated livability benchmark strictly for a district across all analyzed localities.
    Returns has_data=False and None metrics when no localities are evaluated yet,
    strictly preventing misleading 0 counts.
    """
    geo_data = get_geo_data()
    state_key = next((k for k in geo_data if k.lower() == state.strip().lower()), None)
    if not state_key:
        state_key = next((k for k in geo_data if state.strip().lower() in k.lower() or k.lower() in state.strip().lower()), None)
    if not state_key:
        raise HTTPException(status_code=404, detail=f"State '{state}' not found.")

    district_key = next((k for k in geo_data[state_key] if k.lower() == district.strip().lower()), None)
    if not district_key:
        district_key = next((k for k in geo_data[state_key] if district.strip().lower() in k.lower() or k.lower() in district.strip().lower()), None)
    if not district_key:
        raise HTTPException(status_code=404, detail=f"District '{district}' not found.")

    total_cities = len(geo_data[state_key][district_key])
    clean_dist = district_key.split("(")[0].strip()

    # Query DB strictly for localities belonging to THIS district
    district_locs = db.query(Locality).filter(
        (Locality.district.ilike(f"%{clean_dist}%")) |
        ((Locality.city.ilike(f"%{clean_dist}%")) & (Locality.state.ilike(f"%{state_key.split()[0]}%")))
    ).all()

    scored_count = len(district_locs)
    if scored_count > 0:
        avg_score = round(sum(l.quality_score for l in district_locs if l.quality_score) / scored_count, 1)
        total_health = sum(l.healthcare_count or 0 for l in district_locs)
        total_green = sum(l.green_space_count or 0 for l in district_locs)
        total_transit = sum(l.transit_count or 0 for l in district_locs)
        total_amenities = sum(l.amenity_count or 0 for l in district_locs)
        best_loc = max(district_locs, key=lambda l: l.quality_score or 0)
        top_locality = {"name": best_loc.name, "quality_score": best_loc.quality_score}
        has_data = True
    else:
        avg_score = None
        total_health = None
        total_green = None
        total_transit = None
        total_amenities = None
        top_locality = None
        has_data = False

    return {
        "state": state_key,
        "district": district_key,
        "has_data": has_data,
        "status": "evaluated" if has_data else "pending_evaluation",
        "total_listed_cities": total_cities,
        "scored_cities_count": scored_count,
        "average_quality_score": avg_score,
        "total_healthcare_facilities": total_health,
        "total_green_spaces": total_green,
        "total_transit_stations": total_transit,
        "total_amenities": total_amenities,
        "top_locality": top_locality
    }
