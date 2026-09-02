from backend.config import ROADS, TOTAL_GREEN_BUDGET_S

FIXED_GREEN_SECONDS = TOTAL_GREEN_BUDGET_S // len(ROADS)  # 35s per road, equal split

def decide_fixed(state: dict) -> dict:
    return {
        "green_times": {r: FIXED_GREEN_SECONDS for r in ROADS},
        "reason": "Fixed round-robin timing — equal green time regardless of demand.",
        "emergency_active": state.get("emergency", {}).get("active", False),
    }
