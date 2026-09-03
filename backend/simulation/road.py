import random
from collections import deque
from backend.simulation.vehicle import Vehicle

class Road:
    def __init__(self, direction: str, arrival_rate: float = 0.3, rng=None):
        self.direction = direction
        self.arrival_rate = arrival_rate
        self.rng = rng or random
        self.queue = deque()
        self.signal_state = "red"
        self.phase_time_remaining = 0

    def maybe_spawn_vehicle(self, is_emergency: bool = False):
        if self.rng.random() < self.arrival_rate:
            self.queue.append(Vehicle(self.direction, is_emergency))

    def tick_wait_times(self, dt: float = 1.0):
        for v in self.queue:
            v.tick_waiting(dt)

    def release_vehicles(self, count: int):
        released = []
        for _ in range(min(count, len(self.queue))):
            released.append(self.queue.popleft())
        return released

    @property
    def avg_wait_time(self):
        if not self.queue:
            return 0.0
        return sum(v.wait_time for v in self.queue) / len(self.queue)

    def to_state(self):
        return {
            "vehicle_count": len(self.queue),
            "queue_length": len(self.queue),
            "avg_speed_kmph": 20.0 if self.signal_state == "green" else 0.0,
            "avg_wait_time_s": round(self.avg_wait_time, 1),
            "signal_state": self.signal_state,
            "phase_time_remaining_s": self.phase_time_remaining,
        }