import numpy as np
import pandas as pd

def clean_for_json(obj):
    """Clean object for JSON serialization by handling NaN values and NumPy types."""
    if isinstance(obj, dict):
        for key, value in obj.items():
            obj[key] = clean_for_json(value)
        return obj
    elif isinstance(obj, list):
        return [clean_for_json(item) for item in obj]
    elif isinstance(obj, (np.ndarray, pd.Series)):
        return clean_for_json(obj.tolist())
    elif isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32)):
        return None if np.isnan(obj) else float(obj)
    elif pd.isna(obj):
        return None
    else:
        return obj