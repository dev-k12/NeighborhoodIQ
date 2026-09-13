import json
import os
from typing import Dict, Any, List, Tuple
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA

CONFIG_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "config",
    "weights.json"
)

FEATURE_COLS = [
    "healthcare_score",
    "education_score",
    "green_space_score",
    "transit_score",
    "amenity_score",
    "safety_proxy_score",
]

ARCHETYPE_PALETTE = [
    {"color": "#10B981", "bg": "rgba(16, 185, 129, 0.12)"},  # Emerald
    {"color": "#3B82F6", "bg": "rgba(59, 130, 246, 0.12)"},  # Blue
    {"color": "#8B5CF6", "bg": "rgba(139, 92, 246, 0.12)"},  # Purple
    {"color": "#F59E0B", "bg": "rgba(245, 158, 11, 0.12)"},  # Amber
]


def load_cluster_config() -> Dict[str, Any]:
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("clustering", {"n_clusters": 4, "random_state": 42})
    except Exception:
        return {"n_clusters": 4, "random_state": 42}


def generate_cluster_archetype(centroid_scores: Dict[str, float], global_mean: Dict[str, float]) -> Tuple[str, str]:
    """
    Examine centroid feature traits against global averages to generate
    an intuitive, data-driven archetype label and narrative description.
    """
    # Calculate relative deviations from global mean
    diffs = {k: centroid_scores[k] - global_mean[k] for k in centroid_scores}
    sorted_diffs = sorted(diffs.items(), key=lambda item: item[1], reverse=True)
    top_feature, top_val = sorted_diffs[0]
    second_feature, _ = sorted_diffs[1]
    lowest_feature, lowest_val = sorted_diffs[-1]

    # Distinguish archetypes by dominant centroid traits relative to global means
    transit_high = diffs.get("transit_score", 0) > 0
    amenity_high = diffs.get("amenity_score", 0) > 0
    green_high = diffs.get("green_space_score", 0) > 0
    healthcare_high = diffs.get("healthcare_score", 0) > 0
    safety_high = diffs.get("safety_proxy_score", 0) > 0

    if transit_high and amenity_high:
        return (
            "Transit & Commercial Hub",
            "High-density urban node with exceptional metro/bus connectivity and bustling retail/dining amenities."
        )
    elif green_high or (diffs.get("green_space_score", 0) > diffs.get("transit_score", 0)):
        return (
            "Green & Balanced Suburb",
            "Serene residential district characterized by abundant parks, wellness facilities, and family living."
        )
    elif safety_high or healthcare_high:
        return (
            "Premium Civic & Family Haven",
            "Well-established locality boasting dense civic infrastructure, healthcare institutions, and services."
        )
    else:
        return (
            "Developing Residential Area",
            "Emerging residential pocket undergoing infrastructure expansion, offering growth potential at lower density."
        )


def run_clustering(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Run StandardScaler + KMeans (k=4) and 2D PCA projection on localities.
    Returns:
      - Updated DataFrame with cluster_id, cluster_label, cluster_description, pca_x, pca_y
      - Cluster insights summary dictionary with centroids and variance ratios
    """
    cfg = load_cluster_config()
    k = min(cfg.get("n_clusters", 4), len(df))
    random_state = cfg.get("random_state", 42)

    # Ensure all feature columns exist defensively
    for col in FEATURE_COLS:
        if col not in df.columns:
            df[col] = 50.0
    X_df = df[FEATURE_COLS].copy().fillna(50.0)

    # Standard scaling
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_df)

    # KMeans clustering
    kmeans = KMeans(n_clusters=k, random_state=random_state, n_init=10)
    clusters = kmeans.fit_predict(X_scaled)

    # PCA 2D projection for visualization
    pca = PCA(n_components=2, random_state=random_state)
    pca_coords = pca.fit_transform(X_scaled)

    result_df = df.copy()
    result_df["cluster_id"] = clusters
    result_df["pca_x"] = np.round(pca_coords[:, 0], 2)
    result_df["pca_y"] = np.round(pca_coords[:, 1], 2)

    # Generate distinct archetype labels for each cluster by identifying primary specialization
    archetype_definitions = [
        {
            "label": "Transit & Commercial Hub",
            "desc": "High-density urban node with exceptional metro/bus connectivity and bustling retail/dining amenities.",
            "metric": lambda s: s.get("transit_score", 0) + s.get("amenity_score", 0),
        },
        {
            "label": "Green & Balanced Suburb",
            "desc": "Serene residential district characterized by abundant parks, wellness facilities, and community living.",
            "metric": lambda s: s.get("green_space_score", 0) * 1.5 + s.get("safety_proxy_score", 0),
        },
        {
            "label": "Premium Civic Haven",
            "desc": "Well-established locality boasting dense healthcare institutions, renowned schools, and civic infrastructure.",
            "metric": lambda s: s.get("healthcare_score", 0) + s.get("education_score", 0),
        },
        {
            "label": "Developing Residential Area",
            "desc": "Emerging residential pocket undergoing infrastructure expansion, offering growth potential at lower density.",
            "metric": lambda s: -sum(s.values()),
        },
    ]

    # Compute raw centroid scores
    raw_centroids = {}
    for c_id in range(k):
        c_sub = result_df[result_df["cluster_id"] == c_id]
        raw_centroids[c_id] = {
            col: float(c_sub[col].mean()) if len(c_sub) > 0 else 50.0
            for col in FEATURE_COLS
        }

    # Greedy match archetypes to clusters based on highest score for that archetype
    assigned_archetypes = {}
    used_clusters = set()

    for arch in archetype_definitions:
        best_cid = None
        best_val = -float("inf")
        for c_id in range(k):
            if c_id in used_clusters:
                continue
            val = arch["metric"](raw_centroids[c_id])
            if val > best_val:
                best_val = val
                best_cid = c_id
        if best_cid is not None:
            assigned_archetypes[best_cid] = arch
            used_clusters.add(best_cid)

    # Fallback in case k > 4
    for c_id in range(k):
        if c_id not in assigned_archetypes:
            assigned_archetypes[c_id] = archetype_definitions[c_id % len(archetype_definitions)]

    cluster_meta: Dict[int, Dict[str, Any]] = {}
    for c_id in range(k):
        c_sub = result_df[result_df["cluster_id"] == c_id]
        arch = assigned_archetypes[c_id]
        palette = ARCHETYPE_PALETTE[c_id % len(ARCHETYPE_PALETTE)]

        cluster_meta[c_id] = {
            "id": c_id,
            "label": arch["label"],
            "description": arch["desc"],
            "size": int(len(c_sub)),
            "color": palette["color"],
            "bg": palette["bg"],
            "centroid_scores": {k.replace("_score", ""): round(v, 1) for k, v in raw_centroids[c_id].items()},
        }

    # Map labels and descriptions back to DataFrame
    result_df["cluster_label"] = result_df["cluster_id"].map(lambda c: cluster_meta[c]["label"])
    result_df["cluster_description"] = result_df["cluster_id"].map(lambda c: cluster_meta[c]["description"])

    insights = {
        "n_clusters": k,
        "pca_variance_ratio": [round(float(v), 3) for v in pca.explained_variance_ratio_],
        "clusters": list(cluster_meta.values()),
        "scatter_points": [
            {
                "id": int(row["id"]),
                "name": str(row["name"]),
                "city": str(row["city"]),
                "cluster_id": int(row["cluster_id"]),
                "cluster_label": str(row["cluster_label"]),
                "color": cluster_meta[int(row["cluster_id"])]["color"],
                "x": float(row["pca_x"]),
                "y": float(row["pca_y"]),
                "quality_score": round(float(row["quality_score"]), 1),
            }
            for _, row in result_df.iterrows()
        ]
    }

    return result_df, insights
