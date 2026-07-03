def min_max_norm(value: float, min_val: float, max_val: float) -> float:
    """Normalize value to 0-1 range."""
    if max_val <= min_val:
        return 0.0
    return max(0.0, min(1.0, (value - min_val) / (max_val - min_val)))
