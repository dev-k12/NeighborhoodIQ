import json
import logging
import os
import re
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import pandas as pd

from app.db.database import get_db
from app.models.locality import Locality
from app.analytics.osm_client import (
    geocode_locality,
    geocode_pincode,
    fetch_osm_counts,
    haversine_distance,
    is_name_match,
)
from app.analytics.scoring import compute_single_locality_scores, calculate_quality_score, FEATURE_KEYS
from app.analytics.clustering import run_clustering

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/localities", tags=["Localities"])

PINCODE_REGEX = re.compile(r"^\s*([1-9][0-9]{5})\s*$")

PINCODES_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data",
    "india_pincodes.json"
)

def _load_pincodes_data() -> Dict[str, Any]:
    if os.path.exists(PINCODES_FILE):
        try:
            with open(PINCODES_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to load india_pincodes.json: {e}")
    return {}

PINCODES_DATA = _load_pincodes_data()


def find_cached_locality(
    db: Session,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    resolved_pin: Optional[str] = None,
    resolved_name: Optional[str] = None,
    resolved_city: Optional[str] = None,
    resolved_district: Optional[str] = None,
    query_str: Optional[str] = None,
    proximity_meters: float = 300.0,
    name_proximity_meters: float = 2500.0,
) -> Optional[Locality]:
    """
    Robust spatial and semantic deduplication engine.
    Checks in sequence:
    1. Exact 6-digit Indian PIN code match.
    2. Spatial proximity match: any existing locality within ~300 meters.
    3. Name-assisted proximity match: localities with matching/similar names
       within a 2.5 km catchment radius (resolving variations like
       'Connaught Place, New Delhi' vs 'Connaught Place, Central Delhi').
    4. Fallback exact string match on name and city/district.
    """
    # 1. Match by PIN code if valid
    if resolved_pin:
        pin_match = db.query(Locality).filter(Locality.pincode == resolved_pin).first()
        if pin_match:
            total_elements = (
                (pin_match.healthcare_count or 0) +
                (pin_match.education_count or 0) +
                (pin_match.green_space_count or 0) +
                (pin_match.transit_count or 0) +
                (pin_match.amenity_count or 0) +
                (pin_match.safety_proxy_count or 0)
            )
            if total_elements > 0:
                logger.info(f"Deduplication match by PIN code: {resolved_pin} -> '{pin_match.name}' (id={pin_match.id})")
                return pin_match

    # 2. Spatial proximity checks if coordinates are available
    if lat is not None and lon is not None:
        # Coarse bounding box query (~5.5 km) for efficient database filtering
        candidates = db.query(Locality).filter(
            Locality.latitude.between(lat - 0.05, lat + 0.05),
            Locality.longitude.between(lon - 0.05, lon + 0.05)
        ).all()

        if candidates:
            # Sort candidates by exact great-circle distance
            candidate_distances = [
                (cand, haversine_distance(lat, lon, cand.latitude, cand.longitude))
                for cand in candidates
            ]
            candidate_distances.sort(key=lambda x: x[1])

            closest_cand, min_dist = candidate_distances[0]

            # 2a. Pure spatial proximity within threshold (e.g. ~300m)
            if min_dist <= proximity_meters:
                logger.info(
                    f"Deduplication match by pure proximity: ({lat:.6f}, {lon:.6f}) is {min_dist:.1f}m "
                    f"from '{closest_cand.name}' (id={closest_cand.id}, city='{closest_cand.city}') [threshold <= {proximity_meters}m]"
                )
                return closest_cand

            # 2b. Name-assisted proximity match within wider catchment (e.g. 2500m)
            for cand, dist in candidate_distances:
                if dist <= name_proximity_meters:
                    if (
                        is_name_match(cand.name, resolved_name) or
                        (query_str and is_name_match(cand.name, query_str))
                    ):
                        logger.info(
                            f"Deduplication match by name + proximity: '{cand.name}' (id={cand.id}, city='{cand.city}') "
                            f"matches query/resolved name at distance {dist:.1f}m [<= {name_proximity_meters}m]"
                        )
                        return cand

    # 3. Fallback exact string match
    if resolved_name and resolved_city:
        exact = db.query(Locality).filter(
            Locality.name.ilike(resolved_name),
            (Locality.city.ilike(resolved_city) | Locality.district.ilike(resolved_district or resolved_city))
        ).first()
        if exact:
            return exact

    if query_str:
        exact_q = db.query(Locality).filter(Locality.name.ilike(query_str.strip())).first()
        if exact_q:
            return exact_q

    return None




ALLOWED_SORT_FIELDS = {
    "quality_score", "name", "city", "district", "state", "pincode",
    "healthcare_score", "education_score", "green_space_score", "transit_score", "amenity_score", "safety_proxy_score",
    "healthcare_count", "education_count", "green_space_count", "transit_count", "amenity_count", "safety_proxy_count",
    "cluster_id", "created_at", "id"
}


@router.get("")
def list_localities(
    search: Optional[str] = Query(None, description="Search by locality name or pincode"),
    city: Optional[str] = Query(None, description="Filter by city"),
    district: Optional[str] = Query(None, description="Filter by district"),
    pincode: Optional[str] = Query(None, description="Filter by 6-digit postal code"),
    cluster: Optional[int] = Query(None, description="Filter by cluster ID (0-3)"),
    sort_by: Optional[str] = Query("quality_score", description="Field to sort by"),
    order: Optional[str] = Query("desc", description="asc or desc"),
    db: Session = Depends(get_db)
):
    """
    List localities with search, filtering by city/district, pincode, and cluster archetype, and dynamic sorting.
    """
    query = db.query(Locality)

    if search and search.strip():
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            (Locality.name.ilike(search_pattern)) |
            (Locality.city.ilike(search_pattern)) |
            (Locality.district.ilike(search_pattern)) |
            (Locality.state.ilike(search_pattern)) |
            (Locality.pincode.ilike(search_pattern))
        )

    if pincode:
        query = query.filter(Locality.pincode == pincode.strip())

    if district:
        clean_d = district.strip()
        query = query.filter(Locality.district.ilike(f"%{clean_d}%"))

    if city and city.lower() not in ("all", "all india"):
        if city.lower() in ("delhi ncr", "ncr"):
            query = query.filter(Locality.city.in_(["Delhi", "New Delhi", "Noida", "Gurgaon", "Ghaziabad"]))
        else:
            clean_c = city.strip()
            query = query.filter(
                (Locality.city.ilike(f"%{clean_c}%")) |
                (Locality.district.ilike(f"%{clean_c}%"))
            )

    if cluster is not None:
        query = query.filter(Locality.cluster_id == cluster)

    # Compute overall ranks based on quality_score
    all_localities = db.query(Locality).order_by(Locality.quality_score.desc()).all()
    rank_map = {loc.id: idx for idx, loc in enumerate(all_localities, start=1)}

    # Apply sorting with whitelist protection
    effective_sort = sort_by.strip() if (sort_by and sort_by.strip() in ALLOWED_SORT_FIELDS) else "quality_score"
    sort_column = getattr(Locality, effective_sort, Locality.quality_score)
    if order and order.lower() == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())


    localities = query.all()

    result = []
    for loc in localities:
        d = loc.to_dict()
        d["rank"] = rank_map.get(loc.id, 1)
        d["total_localities"] = len(all_localities)
        result.append(d)

    return {
        "count": len(result),
        "total": len(all_localities),
        "localities": result
    }


@router.get("/lookup")
def live_lookup_locality(
    query: str = Query(..., min_length=2, description="Place or locality name or 6-digit Indian PIN code"),
    db: Session = Depends(get_db)
):
    """
    Live lookup pipeline:
    1. Detects 6-digit Indian PIN codes or locality/district/city names.
    2. Checks database cache for existing evaluated records.
    3. Resolves geographic coordinates via India Post directory or OSM Nominatim.
    4. Queries OpenStreetMap Overpass within 1.5 km (1500m) radius.
    5. Deduplicates transit & civic elements.
    6. Normalizes scores against current database benchmarks.
    7. Computes Quality Score and assigns archetype cluster.
    8. Persists to SQLite (with pincode & district) so future visits are instantly cached!
    """
    cleaned_query = query.strip()
    logger.info(f"Initiating live OSM lookup for: '{cleaned_query}'")

    pin_match = PINCODE_REGEX.match(cleaned_query)
    detected_pin = pin_match.group(1) if pin_match else None

    # Step 1: Check if already cached in DB by pincode
    if detected_pin:
        existing_pin_loc = db.query(Locality).filter(Locality.pincode == detected_pin).first()
        if existing_pin_loc:
            total_elements = (
                (existing_pin_loc.healthcare_count or 0) +
                (existing_pin_loc.education_count or 0) +
                (existing_pin_loc.green_space_count or 0) +
                (existing_pin_loc.transit_count or 0) +
                (existing_pin_loc.amenity_count or 0) +
                (existing_pin_loc.safety_proxy_count or 0)
            )
            if total_elements > 0:
                logger.info(f"Found existing cached locality for PIN {detected_pin}: {existing_pin_loc.name}")
                all_locs = db.query(Locality).order_by(Locality.quality_score.desc()).all()
                rank = next((idx for idx, loc in enumerate(all_locs, 1) if loc.id == existing_pin_loc.id), 1)
                res = existing_pin_loc.to_dict()
                res["rank"] = rank
                res["cached"] = True
                return res

    # Step 2: Validate numeric queries vs 6-digit Indian PIN codes
    if cleaned_query.isdigit() and not detected_pin:
        raise HTTPException(
            status_code=400,
            detail=f"'{cleaned_query}' is not a valid 6-digit Indian PIN code. Indian postal codes must be exactly 6 digits (e.g. 110001)."
        )

    # Step 3: Geocode query or PIN code
    geo = None
    if detected_pin:
        if detected_pin in PINCODES_DATA:
            p_info = PINCODES_DATA[detected_pin]
            geo = {
                "name": p_info["name"],
                "city": p_info["district"],
                "district": p_info["district"],
                "state": p_info["state"],
                "latitude": p_info["latitude"],
                "longitude": p_info["longitude"],
                "display_name": f"{p_info['name']}, {p_info['district']}, {p_info['state']} - {detected_pin}, India",
                "pincode": detected_pin
            }
        else:
            geo = geocode_pincode(detected_pin)

    if not geo:
        geo = geocode_locality(cleaned_query)

    if not geo:
        raise HTTPException(
            status_code=404,
            detail=f"Could not find coordinates for '{cleaned_query}' on OpenStreetMap or Indian Postal Directory. Please check the spelling or PIN code."
        )

    lat = geo["latitude"]
    lon = geo["longitude"]
    resolved_name = geo["name"]
    resolved_city = geo["city"]
    resolved_state = geo["state"]
    raw_pin = geo.get("pincode") or detected_pin
    resolved_pin = str(raw_pin).strip() if (raw_pin and PINCODE_REGEX.match(str(raw_pin).strip())) else None
    resolved_district = geo.get("district") or resolved_city

    # Step 3: Check if already present in DB using spatial proximity & semantic deduplication
    existing = find_cached_locality(
        db=db,
        lat=lat,
        lon=lon,
        resolved_pin=resolved_pin,
        resolved_name=resolved_name,
        resolved_city=resolved_city,
        resolved_district=resolved_district,
        query_str=cleaned_query,
        proximity_meters=300.0,
        name_proximity_meters=2500.0
    )

    if existing:
        logger.info(f"Found existing cached locality for '{cleaned_query}' / '{resolved_name}': {existing.name} (id={existing.id}, city={existing.city}, score={existing.quality_score})")
        if resolved_pin and not existing.pincode:
            existing.pincode = resolved_pin
            db.commit()
        all_locs = db.query(Locality).order_by(Locality.quality_score.desc()).all()
        rank = next((idx for idx, loc in enumerate(all_locs, 1) if loc.id == existing.id), 1)
        res = existing.to_dict()
        res["rank"] = rank
        res["cached"] = True
        return res

    # Step 4: Fetch real OSM Overpass counts (1.5km radius BBOX)
    try:
        counts = fetch_osm_counts(lat, lon, radius=1500, delay=0.2)
    except RuntimeError as err:
        logger.error(f"Overpass live query failed: {err}")
        raise HTTPException(
            status_code=503,
            detail=f"OpenStreetMap Overpass servers are momentarily experiencing high traffic. Please retry scoring '{cleaned_query}' in a few seconds."
        )

    # Step 5: Calculate benchmarks from existing localities in DB
    all_localities = db.query(Locality).all()
    benchmarks = {}
    for feat in FEATURE_KEYS:
        vals = [getattr(loc, f"{feat}_count", 0) for loc in all_localities if getattr(loc, f"{feat}_count", 0) > 0]
        if vals:
            benchmarks[feat] = {
                "min": float(min(vals)),
                "max": float(max(vals)) if max(vals) > min(vals) else 100.0
            }

    scores = compute_single_locality_scores(counts, benchmarks)
    quality_score = calculate_quality_score(scores)

    # Step 6: Assign cluster archetype based on scores
    cluster_id = 0
    cluster_label = "Balanced Suburb"
    cluster_description = "Balanced community infrastructure"

    if scores["transit_score"] > 60 and scores["amenity_score"] > 60:
        cluster_id = 1
        cluster_label = "Transit & Commercial Hub"
        cluster_description = "High-density urban node with exceptional transit connectivity and retail amenities."
    elif scores["green_space_score"] > 55:
        cluster_id = 2
        cluster_label = "Green & Balanced Suburb"
        cluster_description = "Serene residential district characterized by abundant parks and wellness facilities."
    elif scores["healthcare_score"] > 50 and scores["education_score"] > 50:
        cluster_id = 0
        cluster_label = "Premium Civic & Family Haven"
        cluster_description = "Well-established locality boasting dense healthcare institutions and schools."
    else:
        cluster_id = 3
        cluster_label = "Developing Residential Area"
        cluster_description = "Emerging residential pocket undergoing infrastructure expansion."

    # Step 7: Persist or update locality in DB
    if not existing:
        existing = find_cached_locality(
            db=db,
            lat=lat,
            lon=lon,
            resolved_pin=resolved_pin,
            resolved_name=resolved_name,
            resolved_city=resolved_city,
            resolved_district=resolved_district,
            query_str=cleaned_query,
            proximity_meters=300.0,
            name_proximity_meters=2500.0
        )

    if existing:
        target_loc = existing
        if resolved_pin:
            target_loc.pincode = resolved_pin
        if resolved_district:
            target_loc.district = resolved_district
    else:
        target_loc = Locality(
            name=resolved_name,
            city=resolved_city,
            district=resolved_district,
            state=resolved_state,
            pincode=resolved_pin,
            latitude=lat,
            longitude=lon,
            is_seed=False
        )
        db.add(target_loc)

    target_loc.latitude = lat
    target_loc.longitude = lon
    target_loc.healthcare_count = counts["healthcare_count"]
    target_loc.education_count = counts["education_count"]
    target_loc.green_space_count = counts["green_space_count"]
    target_loc.transit_count = counts["transit_count"]
    target_loc.amenity_count = counts["amenity_count"]
    target_loc.safety_proxy_count = counts["safety_proxy_count"]
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
    if resolved_pin:
        target_loc.pincode = resolved_pin
    if resolved_district:
        target_loc.district = resolved_district

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



@router.get("/cities")
def get_distinct_cities(db: Session = Depends(get_db)):
    """
    Returns unique cities present in the database, ordered by number of localities.
    """
    from sqlalchemy import func
    results = (
        db.query(Locality.city, func.count(Locality.id).label("count"))
        .group_by(Locality.city)
        .order_by(func.count(Locality.id).desc())
        .all()
    )
    cities = [{"city": r[0], "count": r[1]} for r in results if r[0]]
    return {"cities": cities}


@router.get("/{id}")
def get_locality_detail(id: int, db: Session = Depends(get_db)):
    """
    Get full locality detail including counts, normalized sub-scores,
    cluster archetype, city percentile, and rank.
    """
    locality = db.query(Locality).filter(Locality.id == id).first()
    if not locality:
        raise HTTPException(status_code=404, detail=f"Locality with ID {id} not found")

    all_localities = db.query(Locality).order_by(Locality.quality_score.desc()).all()
    total = len(all_localities)
    rank = next((idx for idx, loc in enumerate(all_localities, 1) if loc.id == locality.id), 1)
    percentile = round(((total - rank) / total) * 100.0, 1) if total > 1 else 100.0

    # City benchmarks for radar comparison
    city_localities = [loc for loc in all_localities if loc.city.lower() == locality.city.lower()]
    city_avg_scores = {}
    for feat in FEATURE_KEYS:
        scores = [getattr(loc, f"{feat}_score", 0.0) for loc in city_localities]
        city_avg_scores[feat] = round(sum(scores) / len(scores), 1) if scores else 50.0

    data = locality.to_dict()
    data["rank"] = rank
    data["total_localities"] = total
    data["percentile"] = percentile
    data["city_benchmarks"] = city_avg_scores
    return data
