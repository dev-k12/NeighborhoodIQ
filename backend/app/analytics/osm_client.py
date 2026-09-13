import json
import logging
import os
import time
from typing import Dict, Any, Optional, Tuple, Set
import requests

logger = logging.getLogger(__name__)

import math

import re

USER_AGENT = "NeighborhoodIQ/1.0"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OVERPASS_SERVERS = [
    "https://overpass.openstreetmap.fr/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://z.overpass-api.de/api/interpreter",
]

# Config file location
CONFIG_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "config",
    "weights.json"
)

try:
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        APP_CONFIG = json.load(f)
except Exception:
    APP_CONFIG = {
        "overpass": {
            "radius_meters": 1500,
            "timeout_seconds": 25,
            "rate_limit_delay_seconds": 0.5
        }
    }


def geocode_locality(name: str, city: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Geocode a locality query into real latitude and longitude using OSM Nominatim.
    Works for any real place name worldwide.
    Always tries both the query with ', India' appended and the raw query.
    """
    headers = {"User-Agent": USER_AGENT}
    
    clean_name = name.strip()
    query_parts = [clean_name]
    if city and city.lower() not in clean_name.lower():
        query_parts.append(city.strip())
    
    base_query = ", ".join(query_parts)
    # Always try both the query with ', India' appended and the raw query,
    # regardless of whether the raw query contains a comma
    if base_query.strip().lower().endswith("india"):
        candidate_queries = [base_query]
    else:
        candidate_queries = [f"{base_query}, India", base_query]

    for search_query in candidate_queries:
        params = {
            "q": search_query,
            "format": "jsonv2",
            "addressdetails": 1,
            "limit": 5
        }

        try:
            response = requests.get(NOMINATIM_URL, params=params, headers=headers, timeout=12)
            if response.status_code == 200 and response.json():
                items = response.json()
                # Prioritize human settlements (suburbs, neighbourhoods, cities, towns)
                # over large administrative district/state polygon centroids that might fall in agricultural fields
                preferred_types = ['neighbourhood', 'suburb', 'residential', 'quarter', 'city', 'town', 'village', 'hamlet']
                data = items[0]
                for pref in preferred_types:
                    match = next((item for item in items if item.get('type') == pref or item.get('addresstype') == pref), None)
                    if match:
                        data = match
                        break

                lat = float(data["lat"])
                lon = float(data["lon"])
                display_name = data.get("display_name", "")
                address = data.get("address", {})
                resolved_city = (
                    address.get("city") or
                    address.get("town") or
                    address.get("suburb") or
                    address.get("state_district") or
                    city or "City"
                )
                resolved_state = address.get("state") or address.get("country") or "India"
                raw_postcode = address.get("postcode", "")
                valid_pin = str(raw_postcode).strip() if (raw_postcode and re.match(r"^[1-9][0-9]{5}$", str(raw_postcode).strip())) else None
                return {
                    "name": clean_name.title(),
                    "city": resolved_city,
                    "state": resolved_state,
                    "latitude": lat,
                    "longitude": lon,
                    "display_name": display_name,
                    "pincode": valid_pin
                }
        except Exception as e:
            logger.error(f"Geocoding error for '{search_query}': {e}")
            continue
    
    return None


def geocode_pincode(pincode: str) -> Optional[Dict[str, Any]]:
    """
    Resolve an Indian 6-digit postal code (PIN code) into coordinates,
    area name, district, and state using Nominatim postalcode query.
    """
    clean_pin = str(pincode).strip()
    headers = {"User-Agent": USER_AGENT}

    params = {
        "postalcode": clean_pin,
        "country": "India",
        "format": "jsonv2",
        "addressdetails": 1,
        "limit": 5
    }

    try:
        response = requests.get(NOMINATIM_URL, params=params, headers=headers, timeout=12)
        if response.status_code == 200 and response.json():
            items = response.json()
            data = items[0]
            lat = float(data["lat"])
            lon = float(data["lon"])
            display_name = data.get("display_name", "")
            address = data.get("address", {})
            name = (
                address.get("suburb") or
                address.get("neighbourhood") or
                address.get("residential") or
                address.get("village") or
                address.get("town") or
                address.get("city") or
                f"PIN {clean_pin}"
            )
            resolved_city = (
                address.get("city") or
                address.get("town") or
                address.get("state_district") or
                address.get("county") or
                "District"
            )
            resolved_state = address.get("state") or "India"
            return {
                "name": name.title(),
                "city": resolved_city,
                "state": resolved_state,
                "latitude": lat,
                "longitude": lon,
                "display_name": display_name,
                "pincode": clean_pin
            }
    except Exception as e:
        logger.error(f"Pincode geocoding error for '{clean_pin}': {e}")

    # Fallback to general query
    return geocode_locality(clean_pin)


def fetch_osm_counts(
    lat: float,
    lon: float,
    radius: Optional[int] = None,
    delay: Optional[float] = None
) -> Dict[str, int]:
    """
    Fetch raw counts of healthcare, education, green spaces, transit, amenities,
    and civic safety infrastructure within an adaptive catchment bounding box (1500m / 1.5 km).
    
    Covers the full spectrum of OpenStreetMap tagging used across Tier-1 metros,
    Tier-2 state capitals, and Tier-3 district headquarters in India.
    
    Crucial: Elements are deduplicated by (osm_type, osm_id) to prevent overlapping
    tags (e.g. highway=bus_stop and public_transport=platform on the same entity)
    from artificially inflating counts.
    """
    radius = radius or 1500
    delay = delay if delay is not None else 0.4
    timeout = APP_CONFIG.get("overpass", {}).get("timeout_seconds", 25)

    # Convert radius in meters to spatial bounding box (south, west, north, east)
    radius_km = radius / 1000.0
    d_lat = radius_km / 111.0
    d_lon = radius_km / (111.0 * max(0.1, math.cos(math.radians(lat))))
    s, w, n, e = lat - d_lat, lon - d_lon, lat + d_lat, lon + d_lon

    # Overpass QL query: uses fast spatial bounding box and comprehensive Indian civic tags
    overpass_query = f"""
    [out:json][timeout:25];
    (
      node["amenity"]({s},{w},{n},{e});
      node["shop"]({s},{w},{n},{e});
      node["leisure"]({s},{w},{n},{e});
      node["healthcare"]({s},{w},{n},{e});
      node["office"]({s},{w},{n},{e});
      node["highway"~"bus_stop|platform"]({s},{w},{n},{e});
      node["railway"~"station|halt|subway_entrance"]({s},{w},{n},{e});
      node["public_transport"~"station|platform|stop_position"]({s},{w},{n},{e});
      way["amenity"]({s},{w},{n},{e});
      way["shop"]({s},{w},{n},{e});
      way["leisure"]({s},{w},{n},{e});
      way["healthcare"]({s},{w},{n},{e});
      way["office"]({s},{w},{n},{e});
      way["building"~"school|college|university|hospital"]({s},{w},{n},{e});
      way["landuse"~"grass|village_green|recreation_ground"]({s},{w},{n},{e});
    );
    out tags;
    """

    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/json"
    }

    elements = []
    success = False

    for server in OVERPASS_SERVERS:
        try:
            if delay > 0:
                time.sleep(delay)
            resp = requests.post(server, data={"data": overpass_query}, headers=headers, timeout=20)
            if resp.status_code == 200:
                try:
                    elements = resp.json().get("elements", [])
                    success = True
                    break
                except Exception as json_err:
                    logger.warning(f"Overpass server {server} returned non-JSON 200: {json_err}")
                    continue
            elif resp.status_code == 429:
                logger.warning(f"Overpass server {server} returned 429 (rate-limit). Backing off 1.5s...")
                time.sleep(1.5)
            else:
                logger.warning(f"Overpass server {server} responded with status {resp.status_code}")
        except Exception as err:
            logger.warning(f"Overpass error querying {server}: {err}")
            continue

    if not success:
        logger.error(f"Failed to fetch live Overpass data for lat={lat}, lon={lon} across all servers.")
        raise RuntimeError("OpenStreetMap Overpass API is temporarily busy or unreachable. Please retry in a few moments.")

    # Deduplication sets keyed by (element_type, element_id)
    healthcare_ids: Set[Tuple[str, int]] = set()
    education_ids: Set[Tuple[str, int]] = set()
    green_space_ids: Set[Tuple[str, int]] = set()
    transit_ids: Set[Tuple[str, int]] = set()
    amenity_ids: Set[Tuple[str, int]] = set()
    safety_proxy_ids: Set[Tuple[str, int]] = set()

    for el in elements:
        el_type = el.get("type", "node")
        el_id = el.get("id")
        if not el_id:
            continue
        key = (el_type, el_id)
        tags = el.get("tags", {})
        name_lower = tags.get("name", "").lower()

        # Transit: bus stops, train/metro stations, railway halts, transit platforms, bus stands
        if (
            tags.get("highway") in ("bus_stop", "platform") or
            tags.get("railway") in ("station", "subway_entrance", "tram_stop", "subway", "halt", "junction") or
            tags.get("public_transport") in ("stop_position", "platform", "station") or
            tags.get("amenity") in ("bus_station", "taxi", "ferry_terminal") or
            "bus stand" in name_lower or
            "railway station" in name_lower
        ):
            transit_ids.add(key)

        # Healthcare: hospitals, clinics, pharmacies, doctors, dentists, blood banks, dispensaries, nursing homes
        if (
            tags.get("amenity") in ("hospital", "clinic", "pharmacy", "doctors", "dentist", "blood_bank", "nursing_home") or
            tags.get("healthcare") in ("hospital", "clinic", "centre", "doctor", "pharmacy", "laboratory") or
            tags.get("shop") == "chemist" or
            tags.get("building") == "hospital" or
            "hospital" in name_lower or
            "nursing home" in name_lower
        ):
            healthcare_ids.add(key)

        # Education: schools, colleges, universities, kindergartens, libraries, coaching centres, research institutes
        if (
            tags.get("amenity") in ("school", "college", "university", "kindergarten", "library", "tuition", "research_institute") or
            tags.get("building") in ("school", "college", "university") or
            tags.get("office") in ("educational_institution", "education") or
            "school" in name_lower or
            "college" in name_lower or
            "vidyalaya" in name_lower
        ):
            education_ids.add(key)

        # Green spaces: parks, gardens, playgrounds, pitches, recreation grounds, sports centres, stadiums
        if (
            tags.get("leisure") in ("park", "garden", "playground", "nature_reserve", "pitch", "sports_centre", "stadium", "fitness_centre") or
            tags.get("landuse") in ("grass", "village_green", "recreation_ground") or
            "park" in name_lower or
            "garden" in name_lower
        ):
            green_space_ids.add(key)

        # Amenities & commerce: restaurants, cafes, supermarkets, bazaars, markets, banks, ATMs, post offices, community centres, shops
        if (
            tags.get("amenity") in ("restaurant", "cafe", "fast_food", "marketplace", "bank", "atm", "post_office", "fuel", "community_centre", "cinema", "place_of_worship") or
            "shop" in tags or
            tags.get("office") in ("government", "administrative", "company", "telecommunication")
        ):
            amenity_ids.add(key)

        # Safety & Civic Governance: police stations, fire stations, administrative courts, townhalls
        if tags.get("amenity") in ("police", "fire_station", "courthouse", "townhall", "prison"):
            safety_proxy_ids.add(key)

    raw_health = len(healthcare_ids)
    raw_edu = len(education_ids)
    raw_green = len(green_space_ids)
    raw_transit = len(transit_ids)
    raw_amenity = len(amenity_ids)
    raw_safety = len(safety_proxy_ids)

    return {
        "healthcare_count": raw_health,
        "education_count": raw_edu,
        "green_space_count": raw_green,
        "transit_count": raw_transit,
        "amenity_count": raw_amenity,
        "safety_proxy_count": raw_safety,
    }


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two points on the Earth surface
    in decimal degrees.
    Returns distance in meters.
    """
    R = 6371000.0  # Earth's mean radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def is_name_match(name1: Optional[str], name2: Optional[str]) -> bool:
    """
    Flexible comparison of two settlement/locality names to handle administrative
    and regional variations (e.g., 'Connaught Place' vs 'Connaught Place, New Delhi').
    """
    if not name1 or not name2:
        return False
    n1 = name1.strip().lower()
    n2 = name2.strip().lower()
    if n1 == n2:
        return True

    clean1 = re.sub(r"[,\-_/]+", " ", n1).strip()
    clean2 = re.sub(r"[,\-_/]+", " ", n2).strip()
    if clean1 == clean2:
        return True

    words1 = [w for w in clean1.split() if len(w) > 2]
    words2 = [w for w in clean2.split() if len(w) > 2]

    stopwords = {
        "india", "delhi", "city", "north", "south", "east", "west",
        "central", "urban", "rural", "district", "state", "nagar", "road", "block"
    }
    sig1 = [w for w in words1 if w not in stopwords]
    sig2 = [w for w in words2 if w not in stopwords]

    if sig1 and sig2:
        s1 = set(sig1)
        s2 = set(sig2)
        if s1 == s2 or s1.issubset(s2) or s2.issubset(s1):
            return True

    return False


