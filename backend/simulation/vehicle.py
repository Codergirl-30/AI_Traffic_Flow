import itertools

class Vehicle:
    _id_counter = itertools.count(1)

    def __init__(self, direction: str, is_emergency: bool = False):
        self.id = next(Vehicle._id_counter)
        self.direction = direction
        self.is_emergency = is_emergency
        self.wait_time = 0.0

    def tick_waiting(self, dt: float = 1.0):
        self.wait_time += dt
        