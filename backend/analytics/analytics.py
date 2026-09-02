class MetricsTracker:
    def __init__(self):
        self.wait_time_samples = []
        self.throughput_total = 0
        self.max_queue_length = 0

    def record_tick(self, state: dict):
        for road in state["roads"].values():
            self.wait_time_samples.append(road["avg_wait_time_s"])
            self.max_queue_length = max(self.max_queue_length, road["queue_length"])

    def record_release(self, count: int):
        self.throughput_total += count

    def summary(self):
        avg_wait = (
            sum(self.wait_time_samples) / len(self.wait_time_samples)
            if self.wait_time_samples else 0.0
        )
        return {
            "avg_wait_time_s": round(avg_wait, 1),
            "throughput_total": self.throughput_total,
            "max_queue_length": self.max_queue_length,
        }