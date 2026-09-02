"""
Emergency vehicle priority override.
"""

from backend.config import ROADS, MIN_GREEN_TIME_S, MAX_GREEN_TIME_S


def is_emergency_active(emergency: dict) -> bool:
    return bool(emergency and emergency.get("active") and emergency.get("direction") in ROADS)


def build_emergency_green_times(emergency: dict) -> dict:
    priority_road = emergency["direction"]
    return {
        road: (MAX_GREEN_TIME_S if road == priority_road else MIN_GREEN_TIME_S)
        for road in ROADS
    }