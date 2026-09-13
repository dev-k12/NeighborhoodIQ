from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.locality import Locality, WeightsUpdateRequest
from app.analytics.scoring import recalculate_all_scores, FEATURE_KEYS, load_config

router = APIRouter(tags=["Scoring & Comparison"])


@router.post("/score/recalculate")
def recalculate_scores(payload: WeightsUpdateRequest, db: Session = Depends(get_db)):
    """
    Recalculate composite quality scores dynamically across all localities using custom weights.
    Returns the newly re-ranked leaderboard and weight distribution.
    """
    localities = db.query(Locality).all()
    if not localities:
        return {"count": 0, "localities": [], "weights": payload.weights}

    localities_dicts = [loc.to_dict() for loc in localities]
    recomputed = recalculate_all_scores(localities_dicts, payload.weights)

    return {
        "count": len(recomputed),
        "weights": payload.weights,
        "localities": recomputed
    }


@router.get("/compare")
def compare_localities(
    ids: str = Query(..., description="Comma-separated IDs of 2 or 3 localities (e.g. '1,5,12')"),
    db: Session = Depends(get_db)
):
    """
    Compare 2 or 3 localities side-by-side:
    - Provides overlapping metrics for radar visualization
    - Determines dimensional category leaders
    - Compares raw counts and normalized scores
    """
    try:
        parsed_ids = [int(x.strip()) for x in ids.split(",") if x.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid locality IDs format. Must be comma-separated integers.")

    if len(parsed_ids) < 2 or len(parsed_ids) > 4:
        raise HTTPException(status_code=400, detail="Please select 2 or 3 localities to compare.")

    localities = db.query(Locality).filter(Locality.id.in_(parsed_ids)).all()
    if len(localities) < len(parsed_ids):
        found_ids = {l.id for l in localities}
        missing = set(parsed_ids) - found_ids
        raise HTTPException(status_code=404, detail=f"Localities with IDs {missing} not found.")

    # Sort in order of requested IDs
    id_order = {val: i for i, val in enumerate(parsed_ids)}
    localities.sort(key=lambda x: id_order.get(x.id, 0))

    # All localities for global ranking
    all_locs = db.query(Locality).order_by(Locality.quality_score.desc()).all()
    rank_map = {loc.id: idx for idx, loc in enumerate(all_locs, start=1)}

    comparison_items = []
    for loc in localities:
        d = loc.to_dict()
        d["rank"] = rank_map.get(loc.id, 1)
        comparison_items.append(d)

    # Category winners analysis
    category_winners = {}
    config = load_config()
    labels = config.get("labels", {})

    for feat in FEATURE_KEYS:
        highest_score = -1.0
        winner_name = None
        winner_id = None
        for item in comparison_items:
            s = item["scores"].get(feat, 0.0)
            if s > highest_score:
                highest_score = s
                winner_name = item["name"]
                winner_id = item["id"]
        category_winners[feat] = {
            "label": labels.get(feat, feat.title()),
            "winner_id": winner_id,
            "winner_name": winner_name,
            "top_score": highest_score
        }

    # Radar comparison array format: [{metric: "Healthcare", "Bandra West": 85.0, "Indiranagar": 72.0}]
    radar_data = []
    for feat in FEATURE_KEYS:
        row = {"metric": labels.get(feat, feat.replace("_", " ").title())}
        for item in comparison_items:
            row[item["name"]] = item["scores"].get(feat, 0.0)
        radar_data.append(row)

    return {
        "count": len(comparison_items),
        "localities": comparison_items,
        "radar_data": radar_data,
        "category_winners": category_winners
    }
