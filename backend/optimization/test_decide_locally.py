from backend.config import ROADS
from backend.optimization.adaptive_controller import decide


def _base_road(vehicle_count=10, queue_length=5, avg_speed_kmph=30.0,
                avg_wait_time_s=10.0, signal_state="red", phase_time_remaining_s=0):
    return {
        "vehicle_count": vehicle_count,
        "queue_length": queue_length,
        "avg_speed_kmph": avg_speed_kmph,
        "avg_wait_time_s": avg_wait_time_s,
        "signal_state": signal_state,
        "phase_time_remaining_s": phase_time_remaining_s,
    }


def scenario_normal():
    return {
        "roads": {road: _base_road() for road in ROADS},
        "weather": "normal",
        "emergency": {"active": False, "direction": None, "eta_s": None},
    }


def scenario_rush_hour_imbalance():
    roads = {road: _base_road() for road in ROADS}
    roads["north"] = _base_road(vehicle_count=60, queue_length=35, avg_speed_kmph=8.0, avg_wait_time_s=90.0)
    return {"roads": roads, "weather": "normal", "emergency": {"active": False, "direction": None, "eta_s": None}}


def scenario_heavy_rain():
    roads = {road: _base_road(avg_speed_kmph=15.0, queue_length=15) for road in ROADS}
    return {"roads": roads, "weather": "heavy_rain", "emergency": {"active": False, "direction": None, "eta_s": None}}


def scenario_emergency():
    roads = {road: _base_road() for road in ROADS}
    return {"roads": roads, "weather": "normal", "emergency": {"active": True, "direction": "east", "eta_s": 12.0}}


def scenario_broken_input():
    return {"weather": "normal", "emergency": {"active": False, "direction": None, "eta_s": None}}


if __name__ == "__main__":
    scenarios = {
        "normal": scenario_normal(),
        "rush_hour_imbalance": scenario_rush_hour_imbalance(),
        "heavy_rain": scenario_heavy_rain(),
        "emergency": scenario_emergency(),
        "broken_input": scenario_broken_input(),
    }

    for name, state in scenarios.items():
        result = decide(state)
        print(f"\n--- {name} ---")
        print("green_times:", result["green_times"])
        print("emergency_active:", result["emergency_active"])
        print("reason:", result["reason"])
        assert set(result["green_times"].keys()) == set(ROADS)
        assert isinstance(result["reason"], str)
        assert isinstance(result["emergency_active"], bool)

    print("\nAll scenarios returned a valid, well-formed decide() output.")