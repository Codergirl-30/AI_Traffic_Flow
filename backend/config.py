"""
Shared constants for AI TrafficFlow.

CRITICAL: This file is imported by ALL THREE people's code (optimization/,
prediction/, simulation/, main.py, analytics/). Nobody should redefine these
numbers locally — always `from backend.config import ...`.

If you need a new shared constant, add it here and ping the team before
changing an existing value — this file is the one exception to "stay in your
own folder" from the git workflow, since by definition it's shared.
"""

# --- Intersection geometry ---
ROADS = ["north", "east", "south", "west"]

# --- Timing (seconds) — identical everywhere, no local re-guessing ---
MIN_GREEN_TIME_S = 15
MAX_GREEN_TIME_S = 60
AMBER_DURATION_S = 3
ALL_RED_DURATION_S = 2

# Target total "green budget" per full cycle across all 4 roads, before
# amber/all-red overhead is added by the simulation layer. Used by the
# adaptive controller to normalize proportional green-time shares.
TOTAL_GREEN_BUDGET_S = 140

# --- Allowed enum values (spelled exactly this way everywhere) ---
SIGNAL_STATES = ("red", "green", "amber")
WEATHER_STATES = ("normal", "light_rain", "heavy_rain")

# --- Update cadence ---
TICK_INTERVAL_S = 1  # one simulated second per TrafficState push  


CORRIDOR_TRAVEL_TIME_S = 8   # fixed travel time from A's output road to B's input road
CORRIDOR_LINK = {
    "from_road": "east",   # Intersection A's output
    "to_road": "west",     # Intersection B's input
}