# NeighborhoodIQ 🏙️
> **Data Analytics Platform for Real-World Urban Livability Scoring & Clustering Across Indian Metros**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?style=flat&logo=react)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg?style=flat&logo=tailwind-css)](https://tailwindcss.com)
[![Scikit-Learn](https://img.shields.io/badge/scikit--learn-1.4-F7931E.svg?style=flat&logo=scikit-learn)](https://scikit-learn.org)
[![OpenStreetMap](https://img.shields.io/badge/Data-OpenStreetMap%20Overpass-7EBC6F.svg?style=flat&logo=openstreetmap)](https://overpass-api.de)

---

## 📌 Problem Statement

When prospective home buyers or renters evaluate residential localities across Indian cities, they are forced to manually open Google Maps, cross-check category-by-category (Where are the hospitals? How far are the schools? Are there metro stations or bus stops nearby? How crowded is the retail zone?), and synthesize fragments with no unified quantitative benchmark.

**NeighborhoodIQ** solves this by pulling **100% genuine, un-fabricated spatial infrastructure data** from OpenStreetMap's Overpass API and Nominatim geocoder across a 1.5 km walkable/accessible catchment radius. It transforms raw entity counts into an objective, normalized **Quality Score (0–100)**, groups localities into intuitive archetypes using **K-Means clustering (k=4)**, visualizes linear relationships with a **Pearson correlation matrix**, and projects multi-dimensional attributes into 2D via **Principal Component Analysis (PCA)**.

---

## 🛠️ Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Recharts (Radar charts, PCA scatter plots), Framer Motion, Lucide Icons
- **Backend**: Python, FastAPI, Uvicorn, Pydantic v2
- **Data Science & ML**: `pandas`, `numpy`, `scikit-learn` (`StandardScaler`, `KMeans`, `PCA`)
- **Database**: SQLite via SQLAlchemy (local single-file database, zero external cloud dependency)
- **Data Pipeline**: OpenStreetMap Nominatim Geocoding + Overpass QL API (real entity counts, zero fake data)

---

## 🧠 Analytics Engine: How Scoring & Clustering Work

### 1. Spatial Entity Extraction & Strict Deduplication
- For any locality coordinate, Overpass QL queries all civic amenities within a **1,500-meter radius circle** (`around:1500,lat,lon`).
- **Entity Deduplication Rule**: In OpenStreetMap, a single transit stop or platform often carries both `highway=bus_stop` and `public_transport=platform` tags across overlapping nodes and ways. NeighborhoodIQ keys all entities by `(osm_type, osm_id)` in memory sets, strictly guaranteeing that duplicate tags on the same physical infrastructure are counted **exactly once**.
- Civic dimensions extracted:
  - **Healthcare**: Hospitals, clinics, pharmacies, doctors (`healthcare_count`)
  - **Education**: Primary/secondary schools, colleges, universities (`education_count`)
  - **Green Spaces**: Public parks, gardens, playgrounds, recreation grounds (`green_space_count`)
  - **Transit Access**: Deduplicated bus stops, metro stations, railway terminals (`transit_count`)
  - **Daily Amenities**: Supermarkets, grocery stores, restaurants, cafes, banks (`amenity_count`)
  - **Civic Safety Proxy**: Police stations within the catchment area (`safety_proxy_count`)

### 2. Multi-Criteria Feature Normalization (0–100 Scale)
Raw infrastructure counts vary widely in scale (e.g., police stations range from 0 to 8, while transit stops range from 15 to 160).
To ensure fair aggregation without arbitrary distortion, each dimension is scaled using robust empirical benchmarks:
$$\text{Score}_i = \text{clip}\left( \frac{\text{Count}_i - \text{Min}_i}{\text{BenchmarkMax}_i - \text{Min}_i} \times 100, 5.0, 100.0 \right)$$
This yields normalized component scores $S_i \in [5, 100]$ across all 6 dimensions.

### 3. Composite Quality Score
The overall Quality Score is computed as a weighted sum of normalized component scores:
$$\text{Quality Score} = \sum_{i=1}^{6} w_i \cdot S_i \quad \text{where} \quad \sum_{i=1}^{6} w_i = 1.0$$
Weights are defined in `backend/config/weights.json` (defaults: Transit 20%, Healthcare 20%, Green Spaces 15%, Education 15%, Amenities 15%, Safety Proxy 15%). Users can drag live weight sliders on the Insights and Home pages to test custom personal priorities and witness the leaderboard re-rank dynamically in real-time.

### 4. Unsupervised K-Means Archetypes ($k=4$)
Rather than using arbitrary subjective labels, NeighborhoodIQ standardizes feature vectors using `StandardScaler` (zero mean, unit variance) and applies `KMeans(n_clusters=4, random_state=42)`.
Centroid traits are analyzed relative to the global dataset mean to produce data-driven archetype labels:
1. **Transit & Commercial Hub**: High-density urban nodes with exceptional bus/metro connectivity and bustling retail/dining amenities (e.g., Bandra West, Karol Bagh).
2. **Green & Balanced Suburb**: Serene residential districts characterized by abundant parks, wellness facilities, and family living (e.g., Hauz Khas, Koregaon Park).
3. **Premium Civic & Family Haven**: Established localities boasting dense healthcare institutions and renowned schools (e.g., Indiranagar, Jayanagar).
4. **Developing Residential Area**: Emerging residential pockets undergoing infrastructure expansion, offering growth potential at lower density (e.g., Electronic City, Hinjewadi).

### 5. Dimensional Reduction & Correlation
- **PCA (2 Components)**: Projects the 6-dimensional feature space into 2D Cartesian coordinates $(x, y)$ explaining significant dataset variance, visualizable as an interactive scatter plot colored by archetype cluster.
- **Pearson Correlation Matrix**: Computes bivariate linear correlation coefficients ($r$) between all infrastructure pairs to quantify urban co-location patterns (e.g., transit hubs strongly correlating with retail amenities).

---

## 🚀 Getting Started Locally

### Prerequisites
- **Python**: 3.10+ (tested on Python 3.12)
- **Node.js**: 18+ (tested on Node v22)
- **npm**: 9+

### 1. Clone & Setup Backend
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Seed SQLite database from real OSM data
# (Reads cached snapshot or queries Overpass API)
python scripts/fetch_osm_data.py

# Launch FastAPI server with auto-reload
uvicorn app.main:app --reload --port 8000
```
The backend will run at `http://localhost:8000`.
Interactive Swagger API documentation is available at `http://localhost:8000/docs`.

### 2. Setup & Run Frontend
In a new terminal window:
```bash
cd frontend

# Install frontend dependencies
npm install

# Start Vite dev server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🗺️ Seeded Localities (30 Total Across 5 Metros)

- **Delhi**: Hauz Khas, Dwarka, Rohini, Vasant Kunj, Karol Bagh, Saket
- **Mumbai**: Bandra West, Andheri West, Powai, Malad West, Dadar, Borivali West
- **Bangalore**: Koramangala, Indiranagar, Whitefield, HSR Layout, Jayanagar, Electronic City
- **Pune**: Koregaon Park, Baner, Hinjewadi, Viman Nagar, Kothrud, Hadapsar
- **Hyderabad**: Banjara Hills, Gachibowli, Madhapur, Kukatpally, Jubilee Hills, Secunderabad

### Worldwide Live Lookup
NeighborhoodIQ is not limited to the 30 seed localities. Type any real neighborhood or place name (e.g. *Connaught Place*, *Juhu*, *Whitefield*, or even international landmarks) into the **"Score any neighborhood outside the seed list"** search bar. The backend will geocode via Nominatim, query Overpass within 1.5 km, deduplicate entities, compute normalized scores, and save it to the SQLite database.

---

## ⚠️ Data Sources & Limitations

1. **OpenStreetMap Public Data**: All infrastructure counts are derived from genuine OpenStreetMap tags within a 1.5 km radius circle around the geocoded coordinates. While OSM is the most detailed open geospatial database in the world, coverage density can vary slightly between core metropolitan areas and newly developed peripheral zones.
2. **Police Station Density as a Civic Proxy**: Official street-level or neighborhood-level crime incident data is not published via open APIs in India. Consequently, the safety dimension in NeighborhoodIQ reflects the density and proximity of police stations and outposts within the 1.5 km catchment area. This is presented as an institutional civic infrastructure proxy, not as an official crime rate index.
3. **Walkable Catchment Radius**: A 1.5 km radial buffer represents an approximate 15-to-20-minute walk or a 5-minute local transit trip, representing typical residential neighborhood accessibility.

---

## 📜 License
MIT License. Built for open, transparent urban data analytics.
