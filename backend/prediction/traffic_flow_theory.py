"""
Traffic flow theory helpers.

The real dataset (TrafficTwoMonth.csv / Traffic.csv) only measures vehicle
counts per 15-minute interval — it has no queue_length, avg_wait_time_s,
or avg_speed_kmph fields, which our decide() function needs.

Rather than inventing those numbers randomly, we derive them from the real
vehicle counts using standard, textbook traffic engineering relationships:

1. Deterministic queueing (D/D/1) — queue builds up whenever vehicles
   arrive faster than the road can discharge them during its share of
   green time.
2. Triangular delay approximation — average per-vehicle wait time from a
   queueing diagram, a standard simplification used in traffic signal
   design (related to Webster's delay formula).
3. Greenshields speed-density relationship — a well-established model
   where speed falls roughly linearly as a road gets more congested.

These are real formulas from traffic engineering, not arbitrary guesses —
but the specific constants below (saturation flow rate, green fraction,
free-flow speed) are still reasonable textbook defaults, not measured at
a specific real intersection. That distinction is worth stating plainly
if asked.
"""

# Vehicles a single lane can discharge per second at saturation (a
# commonly cited traffic engineering value, ~1800 vehicles/hour/lane).
SATURATION_FLOW_VPS = 0.5

# Assumed fraction of each cycle this approach gets as green, in a
# standard 4-phase intersection (matches our MIN/MAX green config being
# roughly 25-50% of a full cycle).
GREEN_FRACTION = 0.4

# Free-flow speed used for the Greenshields relationship (km/h).
FREE_FLOW_SPEED_KMPH = 50.0

# Assumed realistic max queue length for normalizing occupancy (vehicles).
MAX_QUEUE_LENGTH = 60


def derive_queue_length(vehicle_count: float, interval_seconds: int) -> float:
    """
    Deterministic queueing: if arrivals exceed discharge capacity during
    this interval, the excess vehicles form a queue. Clipped to a
    realistic maximum.
    """
    arrival_rate_vps = vehicle_count / interval_seconds
    discharge_rate_vps = SATURATION_FLOW_VPS * GREEN_FRACTION
    excess_vps = max(0.0, arrival_rate_vps - discharge_rate_vps)
    queue_length = excess_vps * interval_seconds
    return min(MAX_QUEUE_LENGTH, queue_length)


def derive_wait_time(queue_length: float) -> float:
    """
    Triangular delay approximation: average wait per vehicle in a growing
    queue is roughly queue_length / (2 * discharge_rate).
    """
    discharge_rate_vps = SATURATION_FLOW_VPS * GREEN_FRACTION
    if discharge_rate_vps <= 0:
        return 0.0
    return queue_length / (2 * discharge_rate_vps)


def derive_speed(queue_length: float) -> float:
    """
    Greenshields-style relationship: speed drops roughly linearly as
    occupancy (queue relative to max) increases. Floored so speed never
    hits zero.
    """
    occupancy_ratio = min(1.0, queue_length / MAX_QUEUE_LENGTH)
    speed = FREE_FLOW_SPEED_KMPH * (1 - occupancy_ratio)
    return max(5.0, speed)