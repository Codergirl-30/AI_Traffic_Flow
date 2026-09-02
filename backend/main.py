import asyncio
from fastapi import FastAPI, WebSocket

from backend.config import TICK_INTERVAL_S
from backend.simulation.intersection import Intersection
from backend.simulation.fixed_controller import decide_fixed
from backend.optimization.adaptive_controller import decide as decide_adaptive
from backend.analytics.analytics import MetricsTracker

app = FastAPI()

fixed_sim = Intersection()
adaptive_sim = Intersection()
fixed_metrics = MetricsTracker()
adaptive_metrics = MetricsTracker()

async def run_tick():
    fixed_sim.step()
    adaptive_sim.step()

    fixed_state = fixed_sim.snapshot(mode="fixed")
    adaptive_state = adaptive_sim.snapshot(mode="adaptive")

    fixed_decision = decide_fixed(fixed_state)
    adaptive_decision = decide_adaptive(adaptive_state)

    fixed_sim.apply_green_times(fixed_decision["green_times"])
    adaptive_sim.apply_green_times(adaptive_decision["green_times"])

    fixed_metrics.record_tick(fixed_state)
    adaptive_metrics.record_tick(adaptive_state)

    fixed_state["decision"] = fixed_decision
    adaptive_state["decision"] = adaptive_decision
    fixed_state["metrics"] = fixed_metrics.summary()
    adaptive_state["metrics"] = adaptive_metrics.summary()

    return {"fixed": fixed_state, "adaptive": adaptive_state}

@app.websocket("/ws")
async def traffic_feed(websocket: WebSocket):
    await websocket.accept()
    while True:
        payload = await run_tick()
        await websocket.send_json(payload)
        await asyncio.sleep(TICK_INTERVAL_S)