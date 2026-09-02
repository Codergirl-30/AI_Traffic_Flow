"""
Adaptive Controller — the single public entrypoint: decide(state) -> dict
Never raises, never returns None. Falls back to an equal green split on
any internal error.
"""

from backend.config import ROADS, MIN_GREEN_TIME_S, MAX_GREEN_TIME_S, TOTAL_GREEN_BUDGET_S
from backend.optimization.emergency import is_emergency_active, build_emergency_green_times
from backend.optimization.rain_adjustment import get_weather_profile
from backend.optimization.explainer import explain_emergency, explain_normal, explain_fallback
from backend.prediction.predictor import predict_demand

_consecutive_red_ticks = {road: 0 for road in ROADS}
_STARVATION_TICK_THRESHOLD = 20


def _equal_split_fallback(emergency_active: bool = False, error: Exception = None) -> dict:
    equal_time = TOTAL_GREEN_BUDGET_S // len(ROADS)
    equal_time = max(MIN_GREEN_TIME_S, min(MAX_GREEN_TIME_S, equal_time))
    reason = explain_fallback(error) if error else "Equal green split (no adaptive signal available)."
    return {
        "green_times": {road: equal_time for road in ROADS},
        "reason": reason,
        "emergency_active": emergency_active,
    }


def _update_starvation_counters(roads: dict) -> list:
    starved = []
    for road in ROADS:
        signal_state = roads.get(road, {}).get("signal_state", "red")
        if signal_state == "green":
            _consecutive_red_ticks[road] = 0
        else:
            _consecutive_red_ticks[road] += 1
        if _consecutive_red_ticks[road] >= _STARVATION_TICK_THRESHOLD:
            starved.append(road)
    return starved


def _score_road(road: str, road_state: dict, weather_profile: dict, predicted: float) -> float:
    queue_length = road_state.get("queue_length", 0)
    vehicle_count = road_state.get("vehicle_count", 0)
    avg_wait_time_s = road_state.get("avg_wait_time_s", 0.0)
    avg_speed_kmph = road_state.get("avg_speed_kmph", 30.0)

    score = (
        weather_profile["queue_weight"] * queue_length
        + 0.5 * vehicle_count
        + weather_profile["wait_weight"] * 0.4 * avg_wait_time_s
        + weather_profile["speed_weight"] * max(0.0, (40 - avg_speed_kmph)) * 0.2
        + predicted
    )
    return max(0.0, score)


def _allocate_green_times(scores: dict, starved_roads: list, min_green_floor: int) -> dict:
    boosted_scores = dict(scores)
    for road in starved_roads:
        boosted_scores[road] = boosted_scores.get(road, 0.0) + 1000.0

    total_score = sum(boosted_scores.values())
    green_times = {}

    if total_score <= 0:
        equal_time = max(min_green_floor, TOTAL_GREEN_BUDGET_S // len(ROADS))
        return {road: min(MAX_GREEN_TIME_S, equal_time) for road in ROADS}

    for road in ROADS:
        share = boosted_scores.get(road, 0.0) / total_score
        raw_time = share * TOTAL_GREEN_BUDGET_S
        clamped = max(min_green_floor, min(MAX_GREEN_TIME_S, int(round(raw_time))))
        green_times[road] = clamped

    return green_times


def decide(state: dict) -> dict:
    try:
        roads = state.get("roads", {})
        weather = state.get("weather", "normal")
        emergency = state.get("emergency", {}) or {}

        if is_emergency_active(emergency):
            green_times = build_emergency_green_times(emergency)
            reason = explain_emergency(emergency["direction"], emergency.get("eta_s"))
            return {
                "green_times": green_times,
                "reason": reason,
                "emergency_active": True,
            }

        weather_profile = get_weather_profile(weather)
        starved_roads = _update_starvation_counters(roads)

        predicted_demand = {}
        scores = {}
        for road in ROADS:
            road_state = roads.get(road, {})
            predicted = predict_demand(road_state)
            predicted_demand[road] = predicted
            scores[road] = _score_road(road, road_state, weather_profile, predicted)

        green_times = _allocate_green_times(
            scores, starved_roads, weather_profile["min_green_floor_s"]
        )

        chosen_road = max(scores, key=scores.get) if scores else ROADS[0]
        if starved_roads:
            chosen_road = starved_roads[0]

        reason = explain_normal(
            chosen_road, scores, roads, weather, predicted_demand, starved_roads
        )

        return {
            "green_times": green_times,
            "reason": reason,
            "emergency_active": False,
        }

    except Exception as error:
        emergency_flag = False
        try:
            emergency_flag = bool(state.get("emergency", {}).get("active"))
        except Exception:
            pass
        return _equal_split_fallback(emergency_active=emergency_flag, error=error)