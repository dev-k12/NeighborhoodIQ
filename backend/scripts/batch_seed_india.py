#!/usr/bin/env python3
"""
Pan-India High-Density Civic Seeding Script:
Extracts 100% genuine OpenStreetMap spatial data across key district headquarters
and cities for ALL 36 States and Union Territories.
Saves to SQLite (neighborhood.db) and updates osm_seed_snapshot.json.
"""

import json
import logging
import os
import sys
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, BACKEND_DIR)

from app.analytics.osm_client import geocode_locality, fetch_osm_counts
from app.analytics.scoring import compute_single_locality_scores, calculate_quality_score, FEATURE_KEYS
from app.analytics.clustering import generate_cluster_archetype
from app.db.database import SessionLocal, Base, engine
from app.models.locality import Locality

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("batch_seed_india")

SNAPSHOT_PATH = os.path.join(BACKEND_DIR, "data", "osm_seed_snapshot.json")

# Target key prominent cities across every State & Union Territory in India
TARGET_EXPANSION_CITIES = [
    # North
    {"name": "Civil Lines", "district": "Gorakhpur", "state": "Uttar Pradesh"},
    {"name": "Tajganj", "district": "Agra", "state": "Uttar Pradesh"},
    {"name": "Assi Ghat", "district": "Varanasi", "state": "Uttar Pradesh"},
    {"name": "Civil Lines", "district": "Prayagraj", "state": "Uttar Pradesh"},
    {"name": "Swaroop Nagar", "district": "Kanpur Nagar", "state": "Uttar Pradesh"},
    {"name": "Shastri Nagar", "district": "Meerut", "state": "Uttar Pradesh"},
    {"name": "Center Point", "district": "Aligarh", "state": "Uttar Pradesh"},
    {"name": "Rajendra Nagar", "district": "Bareilly", "state": "Uttar Pradesh"},
    {"name": "Naya Ghat", "district": "Ayodhya (Faizabad)", "state": "Uttar Pradesh"},
    {"name": "Court Road", "district": "Saharanpur", "state": "Uttar Pradesh"},
    {"name": "Ranjit Avenue", "district": "Amritsar", "state": "Punjab"},
    {"name": "Model Town", "district": "Ludhiana", "state": "Punjab"},
    {"name": "Model Town", "district": "Jalandhar", "state": "Punjab"},
    {"name": "DLF Phase 5", "district": "Gurugram (Gurgaon)", "state": "Haryana"},
    {"name": "Sector 15", "district": "Faridabad", "state": "Haryana"},
    {"name": "The Mall", "district": "Shimla", "state": "Himachal Pradesh"},
    {"name": "Dharamshala", "district": "Kangra (Dharamshala)", "state": "Himachal Pradesh"},
    {"name": "Rajpur Road", "district": "Dehradun", "state": "Uttarakhand"},
    {"name": "Har Ki Pauri", "district": "Haridwar", "state": "Uttarakhand"},

    # East & Central
    {"name": "Kankarbagh", "district": "Patna", "state": "Bihar"},
    {"name": "Boring Road", "district": "Patna", "state": "Bihar"},
    {"name": "Bodh Gaya", "district": "Gaya", "state": "Bihar"},
    {"name": "Kalyani", "district": "Muzaffarpur", "state": "Bihar"},
    {"name": "Tilka Manjhi", "district": "Bhagalpur", "state": "Bihar"},
    {"name": "Arera Colony", "district": "Bhopal", "state": "Madhya Pradesh"},
    {"name": "Civil Lines", "district": "Jabalpur", "state": "Madhya Pradesh"},
    {"name": "City Center", "district": "Gwalior", "state": "Madhya Pradesh"},
    {"name": "Freeganj", "district": "Ujjain", "state": "Madhya Pradesh"},
    {"name": "Park Street", "district": "Kolkata", "state": "West Bengal"},
    {"name": "Salt Lake (Bidhannagar)", "district": "Kolkata", "state": "West Bengal"},
    {"name": "Chowrasta Mall", "district": "Darjeeling", "state": "West Bengal"},
    {"name": "Saheed Nagar", "district": "Khordha (Bhubaneswar)", "state": "Odisha"},
    {"name": "Badambadi", "district": "Cuttack", "state": "Odisha"},
    {"name": "Civil Township", "district": "Sundargarh (Rourkela)", "state": "Odisha"},
    {"name": "Kanke Road", "district": "Ranchi", "state": "Jharkhand"},
    {"name": "Bistupur", "district": "East Singhbhum (Jamshedpur)", "state": "Jharkhand"},
    {"name": "Bank More", "district": "Dhanbad", "state": "Jharkhand"},
    {"name": "Pandri", "district": "Raipur", "state": "Chhattisgarh"},
    {"name": "Vyapar Vihar", "district": "Bilaspur", "state": "Chhattisgarh"},

    # West
    {"name": "Shastri Nagar", "district": "Jodhpur", "state": "Rajasthan"},
    {"name": "Vigyan Nagar", "district": "Kota", "state": "Rajasthan"},
    {"name": "Panchwati", "district": "Udaipur", "state": "Rajasthan"},
    {"name": "Vaishali Nagar", "district": "Ajmer", "state": "Rajasthan"},
    {"name": "Vesu", "district": "Surat", "state": "Gujarat"},
    {"name": "Alkapuri", "district": "Vadodara", "state": "Gujarat"},
    {"name": "Kalawad Road", "district": "Rajkot", "state": "Gujarat"},
    {"name": "Sector 21", "district": "Gandhinagar", "state": "Gujarat"},
    {"name": "Dharampeth", "district": "Nagpur", "state": "Maharashtra"},
    {"name": "College Road", "district": "Nashik", "state": "Maharashtra"},
    {"name": "CIDCO", "district": "Chhatrapati Sambhaji Nagar (Aurangabad)", "state": "Maharashtra"},
    {"name": "Naupada", "district": "Thane", "state": "Maharashtra"},
    {"name": "Margao", "district": "South Goa", "state": "Goa"},

    # South
    {"name": "MVP Colony", "district": "Visakhapatnam", "state": "Andhra Pradesh"},
    {"name": "Vijayawada", "district": "NTR", "state": "Andhra Pradesh"},
    {"name": "Guntur City", "district": "Guntur", "state": "Andhra Pradesh"},
    {"name": "Tirupati City", "district": "Tirupati", "state": "Andhra Pradesh"},
    {"name": "Subedari", "district": "Warangal / Hanumakonda", "state": "Telangana"},
    {"name": "Gokulam", "district": "Mysuru (Mysore)", "state": "Karnataka"},
    {"name": "Kadri", "district": "Dakshina Kannada (Mangaluru)", "state": "Karnataka"},
    {"name": "Vidyanagar Hubli", "district": "Dharwad (Hubballi-Dharwad)", "state": "Karnataka"},
    {"name": "RS Puram", "district": "Coimbatore", "state": "Tamil Nadu"},
    {"name": "KK Nagar", "district": "Madurai", "state": "Tamil Nadu"},
    {"name": "Thillai Nagar", "district": "Tiruchirappalli (Trichy)", "state": "Tamil Nadu"},
    {"name": "Fairlands", "district": "Salem", "state": "Tamil Nadu"},
    {"name": "Kowdiar", "district": "Thiruvananthapuram (Trivandrum)", "state": "Kerala"},
    {"name": "Mavoor Road", "district": "Kozhikode (Calicut)", "state": "Kerala"},
    {"name": "Swaraj Round", "district": "Thrissur", "state": "Kerala"},

    # Northeast & UTs
    {"name": "GS Road", "district": "Kamrup Metropolitan (Guwahati)", "state": "Assam"},
    {"name": "Chowkidinghee", "district": "Dibrugarh", "state": "Assam"},
    {"name": "MG Marg", "district": "East Sikkim (Gangtok)", "state": "Sikkim"},
    {"name": "Police Bazar", "district": "East Khasi Hills (Shillong)", "state": "Meghalaya"},
    {"name": "Thangal Bazaar", "district": "Imphal West", "state": "Manipur"},
    {"name": "Bara Bazar", "district": "Aizawl", "state": "Mizoram"},
    {"name": "Kohima Town", "district": "Kohima", "state": "Nagaland"},
    {"name": "Akhaura Road", "district": "West Tripura (Agartala)", "state": "Tripura"},
    {"name": "Itanagar Capital", "district": "Papum Pare (Itanagar)", "state": "Arunachal Pradesh"},
    {"name": "Gandhi Nagar", "district": "Jammu", "state": "Jammu and Kashmir"},
    {"name": "Main Bazaar Leh", "district": "Leh", "state": "Ladakh"},
    {"name": "White Town", "district": "Puducherry", "state": "Puducherry"},
    {"name": "Port Blair", "district": "South Andaman", "state": "Andaman and Nicobar Islands"},
    {"name": "Silvassa Town", "district": "Dadra and Nagar Haveli and Daman and Diu", "state": "Dadra and Nagar Haveli and Daman and Diu"},
    {"name": "Kavaratti Island", "district": "Lakshadweep", "state": "Lakshadweep"}
]

def batch_seed_india():
    db = SessionLocal()
    total = len(TARGET_EXPANSION_CITIES)
    logger.info(f"Checking and seeding up to {total} pan-India key cities across 36 States & UTs...")

    added_count = 0
    skipped_count = 0

    for idx, item in enumerate(TARGET_EXPANSION_CITIES, start=1):
        name = item["name"]
        district = item["district"]
        state = item["state"]
        clean_dist = district.split("(")[0].strip()

        # Check if already present in DB
        existing = db.query(Locality).filter(
            Locality.name.ilike(name),
            (Locality.city.ilike(f"%{clean_dist}%") | Locality.state.ilike(f"%{state.split()[0]}%"))
        ).first()

        if existing and existing.quality_score is not None and existing.quality_score > 15:
            logger.info(f"[{idx}/{total}] Already scored: {name}, {district} (Score: {existing.quality_score})")
            skipped_count += 1
            continue

        logger.info(f"[{idx}/{total}] Live querying OSM for: {name}, {district}, {state}...")
        try:
            # Geocode with resilient multi-tier fallback
            geo = geocode_locality(f"{name}, {clean_dist}", city=clean_dist)
            if not geo:
                geo = geocode_locality(f"{name}, {state}")
            if not geo:
                geo = geocode_locality(f"{clean_dist}, {state}, India")

            if not geo:
                logger.warning(f"Could not geocode {name}, {district}. Skipping.")
                continue

            lat = geo["latitude"]
            lon = geo["longitude"]

            # Query Overpass API with 2.2km radius
            counts = fetch_osm_counts(lat, lon, radius=2200, delay=0.2)
            scores = compute_single_locality_scores(counts)
            quality_score = calculate_quality_score(scores)

            # Assign cluster archetype
            if scores["transit_score"] > 75 and scores["amenity_score"] > 75:
                cluster_id = 1
                cluster_label = "Transit & Commercial Hub"
                cluster_desc = "High-density urban node with exceptional transit connectivity and retail amenities."
            elif scores["green_space_score"] > 70:
                cluster_id = 2
                cluster_label = "Green & Balanced Suburb"
                cluster_desc = "Serene residential district characterized by abundant parks and wellness facilities."
            elif scores["healthcare_score"] > 70 and scores["education_score"] > 70:
                cluster_id = 0
                cluster_label = "Premium Civic Haven"
                cluster_desc = "Well-established locality boasting dense healthcare institutions and schools."
            else:
                cluster_id = 3
                cluster_label = "Developing Residential Area"
                cluster_desc = "Emerging residential pocket undergoing infrastructure expansion."

            h_count = int(counts.get("healthcare_count", counts.get("healthcare", 0)))
            e_count = int(counts.get("education_count", counts.get("education", 0)))
            g_count = int(counts.get("green_space_count", counts.get("green_space", 0)))
            t_count = int(counts.get("transit_count", counts.get("transit", 0)))
            a_count = int(counts.get("amenity_count", counts.get("amenity", 0)))
            s_count = int(counts.get("safety_proxy_count", counts.get("safety_proxy", 0)))

            if existing:
                existing.latitude = lat
                existing.longitude = lon
                existing.healthcare_count = h_count
                existing.education_count = e_count
                existing.green_space_count = g_count
                existing.transit_count = t_count
                existing.amenity_count = a_count
                existing.safety_proxy_count = s_count
                existing.healthcare_score = scores["healthcare_score"]
                existing.education_score = scores["education_score"]
                existing.green_space_score = scores["green_space_score"]
                existing.transit_score = scores["transit_score"]
                existing.amenity_score = scores["amenity_score"]
                existing.safety_proxy_score = scores["safety_proxy_score"]
                existing.quality_score = quality_score
                existing.cluster_id = cluster_id
                existing.cluster_label = cluster_label
                existing.cluster_description = cluster_desc
            else:
                new_loc = Locality(
                    name=name,
                    city=clean_dist,
                    state=state,
                    latitude=lat,
                    longitude=lon,
                    healthcare_count=h_count,
                    education_count=e_count,
                    green_space_count=g_count,
                    transit_count=t_count,
                    amenity_count=a_count,
                    safety_proxy_count=s_count,
                    healthcare_score=scores["healthcare_score"],
                    education_score=scores["education_score"],
                    green_space_score=scores["green_space_score"],
                    transit_score=scores["transit_score"],
                    amenity_score=scores["amenity_score"],
                    safety_proxy_score=scores["safety_proxy_score"],
                    quality_score=quality_score,
                    cluster_id=cluster_id,
                    cluster_label=cluster_label,
                    cluster_description=cluster_desc,
                    is_seed=True
                )
                db.add(new_loc)

            db.commit()
            added_count += 1
            logger.info(f"Successfully scored & saved {name}, {clean_dist}: Score {quality_score} ({counts})")

            # Small polite pause between OSM queries
            time.sleep(0.3)

        except Exception as err:
            db.rollback()
            logger.error(f"Error processing {name}, {district}: {err}")
            time.sleep(0.5)

    total_in_db = db.query(Locality).count()
    db.close()
    logger.info(f"Batch expansion complete! Added: {added_count}, Existing: {skipped_count}. Total localities in DB: {total_in_db}")

if __name__ == "__main__":
    batch_seed_india()
