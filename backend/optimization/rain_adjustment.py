"""
Weather-aware scoring adjustments.
"""

from backend.config import MIN_GREEN_TIME_S

_WEATHER_PROFILES = {
    "normal": {
        "queue_weight": 1.0,
        "wait_weight": 1.0,
        "speed_weight": 1.0,
        "min_green_floor_s": MIN_GREEN_TIME_S,
    },
    "light_rain": {
        "queue_weight": 1.2,
        "wait_weight": 1.1,
        "speed_weight": 0.8,
        "min_green_floor_s": MIN_GREEN_TIME_S + 3,
    },
    "heavy_rain": {
        "queue_weight": 1.5,
        "wait_weight": 1.3,
        "speed_weight": 0.6,
        "min_green_floor_s": MIN_GREEN_TIME_S + 7,
    },
}


def get_weather_profile(weather: str) -> dict:
    return _WEATHER_PROFILES.get(weather, _WEATHER_PROFILES["normal"])