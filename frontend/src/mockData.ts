import type { TrafficState } from "./types";

export const mockTrafficState: TrafficState = {
  timestamp: 120,
  mode: "adaptive",
  weather: "normal",

  roads: {
    north: {
      vehicle_count: 42,
      queue_length: 18,
      avg_speed_kmph: 28.5,
      avg_wait_time_s: 34.2,
      signal_state: "green",
      phase_time_remaining_s: 24,
    },

    east: {
      vehicle_count: 21,
      queue_length: 9,
      avg_speed_kmph: 35.2,
      avg_wait_time_s: 18.5,
      signal_state: "red",
      phase_time_remaining_s: 41,
    },

    south: {
      vehicle_count: 35,
      queue_length: 14,
      avg_speed_kmph: 30.1,
      avg_wait_time_s: 27.8,
      signal_state: "red",
      phase_time_remaining_s: 41,
    },

    west: {
      vehicle_count: 12,
      queue_length: 5,
      avg_speed_kmph: 39.4,
      avg_wait_time_s: 11.3,
      signal_state: "red",
      phase_time_remaining_s: 41,
    },
  },

  emergency: {
    active: false,
    direction: null,
    eta_s: null,
  },
};