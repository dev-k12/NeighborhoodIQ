import json
import os
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd

CONFIG_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "config",
    "weights.json"
)

DEFAULT_WEIGHTS = {
    "healthcare": 0.20,
    "education": 0.15,
    "green_space": 0.15,
    "transit": 0.20,
    "amenity": 0.15,
    "safety_proxy": 0.15,
}

FEATURE_KEYS = ["healthcare", "education", "green_space", "transit", "amenity", "safety_proxy"]


def load_config() -> Dict[str, Any]:
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"weights": DEFAULT_WEIGHTS}

import math

SATURATION_THRESHOLDS = {
    "healthcare": 35.0,    # 35 hospitals/clinics = near 100
    "education": 25.0,     # 25 educational institutions = near 100
    "green_space": 25.0,   # 25 parks/gardens = near 100
    "transit": 40.0,       # 40 transit stops/stations = near 100
    "amenity": 80.0,       # 80 amenities/shops = near 100
    "safety_proxy": 5.0,   # 5 police stations = near 100
}


def normalize_series(series: pd.Series, min_val: Optional[float] = None, max_val: Optional[float] = None, feat_name: Optional[str] = None) -> pd.Series:
    """
    Logarithmic saturation model:
    Score = 20.0 + 80.0 * ln(1 + val) / ln(1 + threshold)
    
    Reflects genuine urban livability economics: having 20+ hospitals or 15+ parks provides
    great civic access, while having 500+ commercial shops exhibits diminishing marginal returns.
    Ensures Tier-2/3 Indian cities and district towns are evaluated objectively and fairly.
    """
    thresh = SATURATION_THRESHOLDS.get(feat_name, 40.0) if feat_name else 40.0
    denom = np.log1p(thresh)
    scaled = 20.0 + 80.0 * (np.log1p(series.clip(lower=0)) / denom)
    return scaled.clip(lower=20.0, upper=100.0).round(1)


def normalize_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Given a DataFrame with count columns, compute and return normalized score columns.
    """
    result = df.copy()
    for feat in FEATURE_KEYS:
        count_col = f"{feat}_count"
        score_col = f"{feat}_score"
        if count_col in result.columns:
            result[score_col] = normalize_series(result[count_col], feat_name=feat)
        else:
            result[score_col] = 50.0
    return result


def compute_single_locality_scores(counts: Dict[str, int], benchmarks: Optional[Dict[str, Dict[str, float]]] = None) -> Dict[str, float]:
    """
    Compute normalized 20-100 scores for a single locality using the logarithmic saturation model.
    Used during live lookup across any city in India or worldwide.
    """
    scores = {}
    for feat in FEATURE_KEYS:
        val = float(counts.get(f"{feat}_count", counts.get(feat, 0)))
        thresh = SATURATION_THRESHOLDS.get(feat, 40.0)
        denom = math.log(1.0 + thresh)
        score = 20.0 + 80.0 * (math.log(1.0 + max(0.0, val)) / denom)
        scores[f"{feat}_score"] = round(float(np.clip(score, 20.0, 100.0)), 1)
    return scores


def calculate_quality_score(scores: Dict[str, float], custom_weights: Optional[Dict[str, float]] = None) -> float:
    """
    Calculate composite Quality Score (0-100) = weighted sum of normalized parameters.
    Weights are normalized so they sum to 1.0 even if raw inputs do not.
    """
    config = load_config()
    weights = custom_weights or config.get("weights", DEFAULT_WEIGHTS)

    # Normalize weights so sum is 1.0
    valid_weights = {k: max(0.0, float(weights.get(k, 0.0))) for k in FEATURE_KEYS}
    total_w = sum(valid_weights.values())
    if total_w == 0:
        valid_weights = {k: 1.0 / len(FEATURE_KEYS) for k in FEATURE_KEYS}
        total_w = 1.0
    norm_weights = {k: v / total_w for k, v in valid_weights.items()}

    composite = 0.0
    for feat, w in norm_weights.items():
        score_val = scores.get(f"{feat}_score", scores.get(feat, 50.0))
        composite += w * score_val

    return round(float(np.clip(composite, 0.0, 100.0)), 1)


def recalculate_all_scores(localities_data: List[Dict[str, Any]], custom_weights: Dict[str, float]) -> List[Dict[str, Any]]:
    """
    Recalculate composite quality scores and re-rank all localities given custom weights.
    """
    updated = []
    for item in localities_data:
        scores = item.get("scores", {})
        new_score = calculate_quality_score(scores, custom_weights)
        new_item = dict(item)
        new_item["quality_score"] = new_score
        updated.append(new_item)

    # Sort descending by quality score
    updated.sort(key=lambda x: x["quality_score"], reverse=True)
    for idx, item in enumerate(updated, start=1):
        item["rank"] = idx

    return updated
