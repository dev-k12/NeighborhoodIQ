from typing import Dict, Any, List
import numpy as np
import pandas as pd

FEATURE_KEYS = ["healthcare", "education", "green_space", "transit", "amenity", "safety_proxy"]


def summarize_series(s: pd.Series) -> Dict[str, float]:
    clean = s.dropna()
    if len(clean) == 0:
        return {"mean": 0.0, "median": 0.0, "std": 0.0, "min": 0.0, "max": 0.0, "count": 0}
    return {
        "mean": round(float(clean.mean()), 1),
        "median": round(float(clean.median()), 1),
        "std": round(float(clean.std()), 1) if len(clean) > 1 else 0.0,
        "min": round(float(clean.min()), 1),
        "max": round(float(clean.max()), 1),
        "count": int(len(clean)),
    }


def compute_eda_summary(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Compute comprehensive summary statistics (mean, median, std, min, max)
    overall, grouped by city, and grouped by cluster archetype.
    """
    if len(df) == 0:
        return {"overall": {}, "by_city": {}, "by_cluster": {}}

    # 1. Overall stats
    overall = {"quality_score": summarize_series(df["quality_score"])}
    for feat in FEATURE_KEYS:
        if f"{feat}_score" in df.columns:
            overall[f"{feat}_score"] = summarize_series(df[f"{feat}_score"])
        if f"{feat}_count" in df.columns:
            overall[f"{feat}_count"] = summarize_series(df[f"{feat}_count"])

    # 2. Group by City
    by_city = {}
    for city, city_df in df.groupby("city"):
        city_stats = {
            "locality_count": len(city_df),
            "quality_score": summarize_series(city_df["quality_score"]),
            "metrics": {}
        }
        for feat in FEATURE_KEYS:
            city_stats["metrics"][feat] = {
                "score": summarize_series(city_df[f"{feat}_score"]) if f"{feat}_score" in city_df.columns else {},
                "count": summarize_series(city_df[f"{feat}_count"]) if f"{feat}_count" in city_df.columns else {},
            }
        by_city[city] = city_stats

    # 3. Group by Cluster Archetype
    by_cluster = {}
    cluster_group_col = "cluster_label" if "cluster_label" in df.columns else "cluster_id"
    for cl, cl_df in df.groupby(cluster_group_col):
        cl_stats = {
            "locality_count": len(cl_df),
            "quality_score": summarize_series(cl_df["quality_score"]),
            "metrics": {}
        }
        for feat in FEATURE_KEYS:
            cl_stats["metrics"][feat] = {
                "score": summarize_series(cl_df[f"{feat}_score"]) if f"{feat}_score" in cl_df.columns else {},
                "count": summarize_series(cl_df[f"{feat}_count"]) if f"{feat}_count" in cl_df.columns else {},
            }
        by_cluster[str(cl)] = cl_stats

    return {
        "overall": overall,
        "by_city": by_city,
        "by_cluster": by_cluster,
        "total_localities": len(df),
    }
