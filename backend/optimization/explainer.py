"""
Builds the plain-English "reason" string for every decision.
"""


def explain_emergency(direction: str, eta_s):
    eta_txt = f" (ETA {eta_s:.0f}s)" if isinstance(eta_s, (int, float)) else ""
    return (
        f"Emergency vehicle detected on {direction}{eta_txt} — "
        f"forcing a green corridor on {direction} until it clears."
    )


def explain_normal(chosen_road: str, scores: dict, roads: dict, weather: str,
                    predicted_demand: dict, starved_roads: list) -> str:
    road_state = roads.get(chosen_road, {})
    queue = road_state.get("queue_length", 0)
    predicted = predicted_demand.get(chosen_road, 0.0)

    if chosen_road in starved_roads:
        return (
            f"{chosen_road.capitalize()} received extended green because it has been "
            f"waiting too long without a turn — fairness override to prevent starvation."
        )

    reason = (
        f"{chosen_road.capitalize()} received extended green due to highest priority "
        f"score (queue length {queue}"
    )
    if predicted > 1.0:
        reason += f", predicted demand increase of ~{predicted:.0f} vehicles"
    reason += ")"

    if weather != "normal":
        reason += f", with green times extended for {weather.replace('_', ' ')} conditions"

    reason += "."
    return reason


def explain_fallback(error: Exception) -> str:
    return (
        "Fallback: equal green split applied because the adaptive controller "
        f"hit an internal error ({type(error).__name__}). Safe default in use."
    )