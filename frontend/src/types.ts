export type RoadName = "north" | "east" | "south" | "west";

export type SignalState = "red" | "green" | "amber";

export type Mode = "fixed" | "adaptive";

export type Weather = "normal" | "light_rain" | "heavy_rain";

export interface RoadState {
  vehicle_count: number;
  queue_length: number;
  avg_speed_kmph: number;
  avg_wait_time_s: number;
  signal_state: SignalState;
  phase_time_remaining_s: number;
}

export interface EmergencyState {
  active: boolean;
  direction: RoadName | null;
  eta_s: number | null;
}

export interface TrafficState {
  timestamp: number;
  mode: Mode;
  weather: Weather;

  roads: Record<RoadName, RoadState>;

  emergency: EmergencyState;
}