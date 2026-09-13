from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
import pandas as pd

from app.db.database import get_db
from app.models.locality import Locality
from app.analytics.correlation import calculate_correlation_matrix
from app.analytics.clustering import run_clustering
from app.analytics.eda import compute_eda_summary
from app.analytics.scoring import load_config

router = APIRouter(prefix="/insights", tags=["Insights & Analytics"])


@router.get("/correlation")
def get_correlation(db: Session = Depends(get_db)):
    """
    Returns the Pearson correlation matrix across all livability metrics.
    """
    localities = db.query(Locality).all()
    if not localities:
        return {"variables": [], "keys": [], "matrix": [], "cells": []}

    data = [loc.to_dict()["scores"] for loc in localities]
    df = pd.DataFrame(data)
    # Rename keys to have _score suffix if needed
    rename_map = {k: f"{k}_score" for k in df.columns if not k.endswith("_score")}
    df = df.rename(columns=rename_map)

    return calculate_correlation_matrix(df)


@router.get("/clusters")
def get_clusters(db: Session = Depends(get_db)):
    """
    Returns KMeans cluster archetypes, centroid breakdown, and 2D PCA scatter projection coordinates.
    """
    localities = db.query(Locality).all()
    if not localities:
        return {"n_clusters": 0, "clusters": [], "scatter_points": []}

    rows = []
    for loc in localities:
        d = loc.to_dict()
        row = {
            "id": loc.id,
            "name": loc.name,
            "city": loc.city,
            "quality_score": loc.quality_score,
            "cluster_id": loc.cluster_id,
            "cluster_label": loc.cluster_label,
            "cluster_description": loc.cluster_description,
        }
        for k, v in d["scores"].items():
            row[f"{k}_score"] = v
        rows.append(row)

    df = pd.DataFrame(rows)
    _, cluster_insights = run_clustering(df)
    return cluster_insights


@router.get("/leaderboard")
def get_leaderboard(
    limit: int = Query(10, ge=1, le=50, description="Number of top localities to return"),
    city: Optional[str] = Query(None, description="Optional city filter"),
    db: Session = Depends(get_db)
):
    """
    Returns top-N ranked localities by Quality Score.
    """
    query = db.query(Locality)
    if city and city.lower() != "all":
        query = query.filter(Locality.city.ilike(city.strip()))

    all_locs = db.query(Locality).order_by(Locality.quality_score.desc()).all()
    rank_map = {loc.id: idx for idx, loc in enumerate(all_locs, start=1)}

    top_localities = query.order_by(Locality.quality_score.desc()).limit(limit).all()

    results = []
    for loc in top_localities:
        d = loc.to_dict()
        d["rank"] = rank_map.get(loc.id, 1)
        results.append(d)

    return {
        "count": len(results),
        "leaderboard": results
    }


@router.get("/eda")
def get_eda(db: Session = Depends(get_db)):
    """
    Returns exploratory data analysis summary statistics (mean, median, std, min, max)
    overall, by city, and by cluster archetype.
    """
    localities = db.query(Locality).all()
    if not localities:
        return {"overall": {}, "by_city": {}, "by_cluster": {}}

    rows = []
    for loc in localities:
        d = loc.to_dict()
        row = {
            "id": loc.id,
            "name": loc.name,
            "city": loc.city,
            "quality_score": loc.quality_score,
            "cluster_label": loc.cluster_label,
        }
        for k, v in d["scores"].items():
            row[f"{k}_score"] = v
        for k, v in d["counts"].items():
            row[f"{k}_count"] = v
        rows.append(row)

    df = pd.DataFrame(rows)
    return compute_eda_summary(df)


@router.get("/weights")
def get_default_weights():
    """
    Returns default weights, labels, and descriptions from config.
    """
    return load_config()
