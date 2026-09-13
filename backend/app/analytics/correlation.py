from typing import Dict, Any, List
import numpy as np
import pandas as pd

FEATURE_KEYS = [
    ("healthcare", "Healthcare"),
    ("education", "Education"),
    ("green_space", "Green Space"),
    ("transit", "Transit Access"),
    ("amenity", "Daily Amenities"),
    ("safety_proxy", "Safety Proxy"),
]


def calculate_correlation_matrix(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Calculate Pearson correlation matrix across all numeric livability parameters.
    Returns structured data optimized for frontend heatmap visualization.
    """
    score_cols = [f"{k}_score" for k, _ in FEATURE_KEYS]
    
    # Fallback to counts if scores are missing
    cols_to_use = []
    labels = []
    keys = []
    for key, label in FEATURE_KEYS:
        if f"{key}_score" in df.columns:
            cols_to_use.append(f"{key}_score")
        elif f"{key}_count" in df.columns:
            cols_to_use.append(f"{key}_count")
        else:
            continue
        labels.append(label)
        keys.append(key)

    if len(cols_to_use) < 2 or len(df) < 2:
        return {"variables": labels, "keys": keys, "matrix": [], "cells": []}

    corr_df = df[cols_to_use].corr(method="pearson").fillna(0.0)

    matrix_rows = []
    cells = []
    for i, row_col in enumerate(cols_to_use):
        row_vals = []
        for j, col_col in enumerate(cols_to_use):
            val = round(float(corr_df.loc[row_col, col_col]), 2)
            row_vals.append(val)
            cells.append({
                "x": labels[j],
                "y": labels[i],
                "x_key": keys[j],
                "y_key": keys[i],
                "value": val,
            })
        matrix_rows.append(row_vals)

    return {
        "variables": labels,
        "keys": keys,
        "matrix": matrix_rows,
        "cells": cells,
        "interpretation": [
            "Values close to +1.0 indicate strong co-location (e.g. transit hubs often attract retail amenities).",
            "Values near 0.0 denote independent civic infrastructure development.",
            "Values close to -1.0 suggest spatial trade-offs (e.g. dense transit nodes having fewer expansive green spaces)."
        ]
    }
