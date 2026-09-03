from backend.config import ROADS
from backend.simulation.road import Road

class Intersection:
    def __init__(self, arrival_rates: dict = None, rng=None):
        rng = rng or random
        arrival_rates = arrival_rates or {r: 0.3 for r in ROADS}
        self.roads = {r: Road(r, arrival_rates[r], rng=rng) for r in ROADS}
        self.weather = "normal"
        self.emergency = {"active": False, "direction": None, "eta_s": None}
        self.vehicles_processed = 0

    def step(self, dt: float = 1.0):
        for road in self.roads.values():
            road.maybe_spawn_vehicle()
            road.tick_wait_times(dt)

    def apply_green_times(self, green_times: dict, throughput_per_sec: int = 1):
        for direction, seconds in green_times.items():
            road = self.roads[direction]
            road.signal_state = "green"
            road.phase_time_remaining = seconds
            released = road.release_vehicles(int(seconds * throughput_per_sec))
            self.vehicles_processed += len(released)

    def snapshot(self, mode: str):
        return {
            "mode": mode,
            "weather": self.weather,
            "roads": {d: r.to_state() for d, r in self.roads.items()},
            "emergency": self.emergency,
        }