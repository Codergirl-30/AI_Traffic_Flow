import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  BarChart3,
  GitCompareArrows,
  Route,
  Siren,
} from "lucide-react";
import {
  Dock,
  DockIcon,
  DockItem,
  DockLabel,
} from "./components/core/dock";
import { InfiniteSlider } from "./components/core/infinite-slider";
import { TextScramble } from "./components/core/text-scramble";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { mockTrafficState } from "./mockData";
import type { TrafficState, RoadName, SignalState } from "./types";

const ROAD_ORDER: RoadName[] = ["north", "east", "south", "west"];

const comparisonData = [
  { metric: "Wait time", Fixed: 42.6, Adaptive: 31.4 },
  { metric: "Queue", Fixed: 16.8, Adaptive: 11.2 },
  { metric: "Throughput", Fixed: 184, Adaptive: 221 },
];

function App() {
  const [traffic, setTraffic] = useState<TrafficState>(mockTrafficState);
  const [isRunning, setIsRunning] = useState(false);
  const [currentGreenRoad, setCurrentGreenRoad] =
    useState<RoadName>("north");
  const [signalPhase, setSignalPhase] =
    useState<"green" | "amber" | "all-red">("green");
  const [phaseTime, setPhaseTime] = useState(24);

  const roadData = Object.values(traffic.roads);

  const totalVehicles = roadData.reduce(
    (sum, road) => sum + road.vehicle_count,
    0
  );

  const averageQueue =
    roadData.length > 0
      ? roadData.reduce((sum, road) => sum + road.queue_length, 0) /
        roadData.length
      : 0;

  const averageSpeed =
    roadData.length > 0
      ? roadData.reduce((sum, road) => sum + road.avg_speed_kmph, 0) /
        roadData.length
      : 0;

  const averageWaitTime =
    roadData.length > 0
      ? roadData.reduce((sum, road) => sum + road.avg_wait_time_s, 0) /
        roadData.length
      : 0;

  /*
   * Simulation:
   * green -> amber -> all-red -> next green.
   * The all-red phase prevents an instant conflicting signal switch.
   */
  useEffect(() => {
    if (!isRunning) return;

    const timer = window.setInterval(() => {
      setTraffic((current) => {
        const currentIndex = ROAD_ORDER.indexOf(currentGreenRoad);

        let nextGreenRoad = currentGreenRoad;
        let nextPhase = signalPhase;
        let nextPhaseTime = phaseTime;

        if (signalPhase === "green") {
          if (phaseTime > 1) {
            nextPhaseTime = phaseTime - 1;
          } else {
            nextPhase = "amber";
            nextPhaseTime = 3;
          }
        } else if (signalPhase === "amber") {
          if (phaseTime > 1) {
            nextPhaseTime = phaseTime - 1;
          } else {
            nextPhase = "all-red";
            nextPhaseTime = 2;
          }
        } else {
          if (phaseTime > 1) {
            nextPhaseTime = phaseTime - 1;
          } else {
            /*
             * Emergency traffic gets priority after the safe all-red phase.
             * Otherwise rotate normally through the four approaches.
             */
            if (
              current.emergency.active &&
              current.emergency.direction !== null
            ) {
              nextGreenRoad = current.emergency.direction;
            } else {
              nextGreenRoad =
                ROAD_ORDER[(currentIndex + 1) % ROAD_ORDER.length];
            }

            nextPhase = "green";
            nextPhaseTime = calculateGreenTime(
              current.mode,
              current.roads[nextGreenRoad]
            );
          }
        }

        const updatedRoads = Object.fromEntries(
          Object.entries(current.roads).map(([road, data]) => {
            const roadName = road as RoadName;

            let newSignalState: SignalState = "red";
            let newTimer = 0;

            if (
              roadName === nextGreenRoad &&
              nextPhase === "green"
            ) {
              newSignalState = "green";
              newTimer = nextPhaseTime;
            }

            if (
              roadName === nextGreenRoad &&
              nextPhase === "amber"
            ) {
              newSignalState = "amber";
              newTimer = nextPhaseTime;
            }

            if (nextPhase === "all-red") {
              newSignalState = "red";
              newTimer = nextPhaseTime;
            }

            const vehicleChange = Math.floor(Math.random() * 5) - 2;

            const newVehicleCount = Math.max(
              0,
              data.vehicle_count + vehicleChange
            );

            const newQueueLength = Math.max(
              0,
              data.queue_length +
                Math.floor(Math.random() * 3) -
                1
            );

            const newSpeed = Math.max(
              5,
              Math.min(
                60,
                data.avg_speed_kmph + (Math.random() * 4 - 2)
              )
            );

            const newWaitTime = Math.max(
              0,
              data.avg_wait_time_s + (Math.random() * 4 - 2)
            );

            return [
              road,
              {
                ...data,
                vehicle_count: newVehicleCount,
                queue_length: newQueueLength,
                avg_speed_kmph: Number(newSpeed.toFixed(1)),
                avg_wait_time_s: Number(newWaitTime.toFixed(1)),
                signal_state: newSignalState,
                phase_time_remaining_s: newTimer,
              },
            ];
          })
        );

        return {
          ...current,
          timestamp: current.timestamp + 1,
          roads: updatedRoads as TrafficState["roads"],
          emergency:
            current.emergency.active &&
            current.emergency.eta_s !== null
              ? {
                  ...current.emergency,
                  eta_s: Math.max(0, current.emergency.eta_s - 1),
                }
              : current.emergency,
        };
      });

      setCurrentGreenRoad((current) => {
        /*
         * The actual road change happens when the state machine reaches
         * the end of all-red. We infer the next road here only when the
         * current phase is all-red and its timer is one.
         */
        if (signalPhase === "all-red" && phaseTime <= 1) {
          return traffic.emergency.active && traffic.emergency.direction
            ? traffic.emergency.direction
            : ROAD_ORDER[
                (ROAD_ORDER.indexOf(current) + 1) % ROAD_ORDER.length
              ];
        }
        return current;
      });

      setSignalPhase((current) => {
        if (current === "green" && phaseTime <= 1) return "amber";
        if (current === "amber" && phaseTime <= 1) return "all-red";
        if (current === "all-red" && phaseTime <= 1) return "green";
        return current;
      });

      setPhaseTime((current) => {
        if (current > 1) return current - 1;
        if (signalPhase === "green") return 3;
        if (signalPhase === "amber") return 2;

        const nextRoad =
          traffic.emergency.active && traffic.emergency.direction
            ? traffic.emergency.direction
            : ROAD_ORDER[
                (ROAD_ORDER.indexOf(currentGreenRoad) + 1) %
                  ROAD_ORDER.length
              ];

        return calculateGreenTime(traffic.mode, traffic.roads[nextRoad]);
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    isRunning,
    currentGreenRoad,
    signalPhase,
    phaseTime,
    traffic.emergency.active,
    traffic.emergency.direction,
    traffic.mode,
    traffic.roads,
  ]);

  /*
   * The values above are intentionally kept close to the original MVP
   * simulation. The visual layer below is the corridor-first redesign.
   */
  const inboundSoon = Math.max(
    0,
    Math.round(traffic.roads.east.vehicle_count * 0.14)
  );

  const isPreGreen =
    traffic.mode === "adaptive" && inboundSoon > 0;

  const resetSimulation = () => {
    setIsRunning(false);
    setTraffic(mockTrafficState);
    setCurrentGreenRoad("north");
    setSignalPhase("green");
    setPhaseTime(24);
  };

  return (
    <div id="top" className="min-h-screen bg-[#F7F4EE] text-[#252827]">
      <div className="mx-auto max-w-[1500px] px-5 py-6 sm:px-8 lg:px-10">

        {/* HEADER */}
        <header className="flex flex-col gap-5 border-b border-[#E3DED5] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold tracking-[0.16em] text-[#7A4E6D]">
              GO WITH THE
            </p>
            <TextScramble
              className="mt-1 text-5xl font-black leading-none tracking-[-0.05em] sm:text-6xl"
              duration={3}
              characterSet=". "
            >
              FLOW
            </TextScramble>
            <p className="mt-3 max-w-xl text-base text-[#68706D]">
              Traffic signals that understand what is coming next.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-[#D9E2D4] bg-[#F1F5ED] px-4 py-2 text-sm font-semibold text-[#4E6B51]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#4E9B68]" />
              System online
            </div>

            <div className="rounded-full border border-[#DED8CF] bg-[#FFFCF7] px-4 py-2 text-sm text-[#68706D]">
              {traffic.timestamp}s simulated
            </div>
          </div>
        </header>

        {/* CONTROLS */}
        <section className="mt-6 rounded-2xl border border-[#E3DED5] bg-[#FFFCF7] p-4 shadow-[0_8px_30px_rgba(37,40,39,0.04)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsRunning(true)}
                className="rounded-xl bg-[#4E9B68] px-5 py-2.5 font-bold text-white transition-all duration-150 hover:brightness-105 active:translate-y-[2px] active:scale-[0.98]"
              >
                ▶ Start
              </button>

              <button
                type="button"
                onClick={() => setIsRunning(false)}
                className="rounded-xl bg-[#D94B4B] px-5 py-2.5 font-bold text-white transition-all duration-150 hover:brightness-105 active:translate-y-[2px] active:scale-[0.98]"
              >
                ■ Stop
              </button>

              <button
                type="button"
                onClick={resetSimulation}
                className="rounded-xl border border-[#D9D4CB] bg-[#F3F0EA] px-5 py-2.5 font-bold text-[#252827] transition-all duration-150 hover:bg-[#EDE9E1] active:translate-y-[2px] active:scale-[0.98]"
              >
                ↻ Reset
              </button>
            </div>

            <ControlGroup label="Signal mode">
              <button
                type="button"
                onClick={() =>
                  setTraffic((current) => ({
                    ...current,
                    mode: "fixed",
                  }))
                }
                className={controlButton(traffic.mode === "fixed")}
              >
                Fixed
              </button>

              <button
                type="button"
                onClick={() =>
                  setTraffic((current) => ({
                    ...current,
                    mode: "adaptive",
                  }))
                }
                className={controlButton(traffic.mode === "adaptive")}
              >
                Adaptive
              </button>
            </ControlGroup>

            <ControlGroup label="Weather">
              <button
                type="button"
                onClick={() =>
                  setTraffic((current) => ({
                    ...current,
                    weather: "normal",
                  }))
                }
                className={controlButton(traffic.weather === "normal")}
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() =>
                  setTraffic((current) => ({
                    ...current,
                    weather: "light_rain",
                  }))
                }
                className={controlButton(traffic.weather === "light_rain")}
              >
                Light rain
              </button>

              <button
                type="button"
                onClick={() =>
                  setTraffic((current) => ({
                    ...current,
                    weather: "heavy_rain",
                  }))
                }
                className={controlButton(traffic.weather === "heavy_rain")}
              >
                Heavy rain
              </button>
            </ControlGroup>

            <div className="flex items-center gap-2 text-sm font-semibold text-[#68706D]">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isRunning ? "bg-[#4E9B68]" : "bg-[#A5A7A3]"
                }`}
              />
              {isRunning ? "Simulation running" : "Simulation stopped"}
            </div>
          </div>
        </section>

        {/* LIVE CORRIDOR */}
        <section id="corridor" className="mt-8 scroll-mt-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold tracking-[0.12em] text-[#7A4E6D]">
                LIVE CORRIDOR
              </p>
              <h2 className="mt-1 text-3xl font-black tracking-[-0.03em]">
                One road. Two intersections. One flow.
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[#68706D]">
                Intersection B prepares for traffic leaving A before those
                vehicles physically arrive.
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-[#68706D]">
              <span className="rounded-full bg-[#EDE9E1] px-3 py-1.5 font-bold text-[#252827]">
                A → B
              </span>
              <span>~8 sec corridor travel</span>
            </div>
          </div>

          <div className="relative min-h-[620px] overflow-hidden rounded-[28px] border border-[#D8D4CC] bg-[#EAE6DE] shadow-[0_18px_55px_rgba(37,40,39,0.08)] lg:min-h-[540px]">

            {/* restrained urban decoration */}
            <div className="absolute left-5 top-5 h-16 w-20 rounded-xl bg-[#D8D8CE] opacity-45" />
            <div className="absolute right-7 bottom-6 h-20 w-24 rounded-xl bg-[#D6D9D0] opacity-45" />
            <div className="absolute left-[8%] bottom-8 h-8 w-8 rounded-full bg-[#A8B59B] opacity-60" />
            <div className="absolute right-[9%] top-8 h-9 w-9 rounded-full bg-[#A8B59B] opacity-60" />

            {/* continuous corridor */}
            <div className="absolute left-0 right-0 top-1/2 h-[150px] -translate-y-1/2 bg-[#5B5E5B]" />
            <div className="absolute left-0 right-0 top-1/2 border-t-2 border-dashed border-[#D1CEC6]/60" />

            {/* direction marker */}
            <div className="absolute left-1/2 top-7 z-30 -translate-x-1/2 rounded-full border border-[#DED8CF] bg-[#FFFCF7]/95 px-4 py-2 text-xs font-bold text-[#5B5E5B] shadow-sm">
              traffic moving A → B
            </div>

            <CorridorIntersection
              label="A"
              side="left"
              traffic={traffic}
              currentGreenRoad={currentGreenRoad}
              phaseTime={phaseTime}
              inboundCount={traffic.roads.east.vehicle_count}
              showPreGreen={false}
            />

            <CorridorIntersection
              label="B"
              side="right"
              traffic={traffic}
              currentGreenRoad={currentGreenRoad}
              phaseTime={phaseTime}
              inboundCount={inboundSoon}
              showPreGreen={isPreGreen}
            />

            {/* highlighted A → B vehicle stream */}
            <div className="absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2">
              {[0, 1, 2, 3].map((index) => (
                <span
                  key={index}
                  className={`h-3.5 w-6 rounded-[5px] border-2 border-[#F7F4EE] bg-[#7A4E6D] shadow-sm transition-transform duration-700 ${
                    isRunning ? "translate-x-1" : ""
                  }`}
                  style={{
                    opacity: 1 - index * 0.16,
                  }}
                />
              ))}
            </div>

            {/* pre-green explanation */}
            <div className="absolute bottom-5 right-5 z-40 w-[250px] rounded-2xl border border-[#D8C8D3] bg-[#FFFCF7] p-4 shadow-[0_12px_35px_rgba(37,40,39,0.12)] sm:bottom-6 sm:right-6">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isPreGreen ? "bg-[#4E9B68]" : "bg-[#A5A7A3]"
                  }`}
                />
                <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#7A4E6D]">
                  {isPreGreen ? "Pre-green active" : "Pre-green ready"}
                </span>
              </div>

              <p className="mt-2 text-sm font-bold leading-5 text-[#252827]">
                B is preparing before the queue arrives.
              </p>

              <p className="mt-1 text-xs leading-5 text-[#68706D]">
                {inboundSoon} vehicles inbound from A.
              </p>
            </div>
          </div>
        </section>

        {/* ROAD SAFETY SLOGANS */}
        <section className="mt-6 overflow-hidden">
          <RoadSafetySlider />
        </section>

        {/* TRAFFIC RIGHT NOW */}
        <section id="traffic" className="mt-8 scroll-mt-6">
          <div className="mb-4">
            <p className="text-sm font-bold tracking-[0.12em] text-[#7A4E6D]">
              TRAFFIC RIGHT NOW
            </p>
            <h2 className="mt-1 text-2xl font-black">
              A quick read of the corridor
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <PerformanceCard
              label="Vehicles"
              value={totalVehicles}
              detail="across the network"
              accent
            />
            <PerformanceCard
              label="Avg queue"
              value={averageQueue.toFixed(1)}
              detail="vehicles"
            />
            <PerformanceCard
              label="Avg speed"
              value={averageSpeed.toFixed(1)}
              detail="km/h"
            />
            <PerformanceCard
              label="Avg wait"
              value={averageWaitTime.toFixed(1)}
              detail="seconds"
            />
          </div>
        </section>

        {/* FIXED VS ADAPTIVE */}
        <section id="strategy" className="mt-8 scroll-mt-6 rounded-2xl border border-[#E3DED5] bg-[#FFFCF7] p-5 shadow-[0_8px_30px_rgba(37,40,39,0.04)]">
          <div className="mb-6">
            <p className="text-sm font-bold tracking-[0.12em] text-[#7A4E6D]">
              STRATEGY
            </p>
            <h2 className="mt-1 text-2xl font-black">
              Fixed vs adaptive
            </h2>
            <p className="mt-1 text-sm text-[#68706D]">
              The adaptive strategy responds to changing traffic demand.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <ComparisonCard
              metric="Average wait time"
              fixed="42.6 s"
              adaptive="31.4 s"
            />
            <ComparisonCard
              metric="Average queue"
              fixed="16.8"
              adaptive="11.2"
            />
            <ComparisonCard
              metric="Throughput"
              fixed="184 veh/hr"
              adaptive="221 veh/hr"
            />
          </div>

          <div className="mt-7 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparisonData}
                margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#DDD8CF"
                />
                <XAxis
                  dataKey="metric"
                  tick={{ fill: "#68706D", fontSize: 12 }}
                  axisLine={{ stroke: "#D8D4CC" }}
                />
                <YAxis
                  tick={{ fill: "#68706D", fontSize: 12 }}
                  axisLine={{ stroke: "#D8D4CC" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFFCF7",
                    border: "1px solid #D8D4CC",
                    borderRadius: "12px",
                    color: "#252827",
                  }}
                />
                <Bar
                  dataKey="Fixed"
                  fill="#A8AAA5"
                  radius={[5, 5, 0, 0]}
                />
                <Bar
                  dataKey="Adaptive"
                  fill="#7A4E6D"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* EMERGENCY */}
        <section id="emergency" className="mt-8 scroll-mt-6 rounded-2xl border border-[#E3DED5] bg-[#FFFCF7] p-5 shadow-[0_8px_30px_rgba(37,40,39,0.04)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold tracking-[0.12em] text-[#7A4E6D]">
                SAFETY OVERRIDE
              </p>
              <h2 className="mt-1 text-xl font-black">
                Emergency vehicle priority
              </h2>
              <p className="mt-1 text-sm text-[#68706D]">
                Simulate an emergency vehicle approaching the intersection.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(["off", "north", "east", "south", "west"] as const).map(
                (direction) => {
                  const active =
                    direction === "off"
                      ? !traffic.emergency.active
                      : traffic.emergency.direction === direction;

                  return (
                    <button
                      type="button"
                      key={direction}
                      onClick={() =>
                        setTraffic((current) => ({
                          ...current,
                          emergency:
                            direction === "off"
                              ? {
                                  active: false,
                                  direction: null,
                                  eta_s: null,
                                }
                              : {
                                  active: true,
                                  direction,
                                  eta_s: 15,
                                },
                        }))
                      }
                      className={`rounded-xl px-4 py-2 text-sm font-bold capitalize transition-all active:translate-y-[2px] ${
                        active
                          ? direction === "off"
                            ? "bg-[#4E9B68] text-white"
                            : "bg-[#D94B4B] text-white"
                          : "border border-[#DDD8CF] bg-[#F3F0EA] text-[#68706D] hover:bg-[#EDE9E1]"
                      }`}
                    >
                      {direction === "off" ? "Off" : direction}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {traffic.emergency.active && (
            <div className="mt-5 flex flex-wrap gap-8 rounded-xl border border-[#E7BABA] bg-[#FCEFEF] px-5 py-4">
              <div>
                <p className="text-xs text-[#9B5B5B]">Status</p>
                <p className="mt-1 font-bold text-[#D94B4B]">
                  Emergency active
                </p>
              </div>

              <div>
                <p className="text-xs text-[#9B5B5B]">Direction</p>
                <p className="mt-1 font-bold uppercase">
                  {traffic.emergency.direction}
                </p>
              </div>

              <div>
                <p className="text-xs text-[#9B5B5B]">ETA</p>
                <p className="mt-1 font-bold">
                  {traffic.emergency.eta_s ?? 0}s
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ROAD DETAIL */}
        <section className="mt-8 pb-10">
          <div className="mb-4">
            <p className="text-sm font-bold tracking-[0.12em] text-[#7A4E6D]">
              ROAD DETAIL
            </p>
            <h2 className="mt-1 text-2xl font-black">
              Traffic state
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ROAD_ORDER.map((road) => {
              const data = traffic.roads[road];

              return (
                <div
                  key={road}
                  className="rounded-2xl border border-[#E3DED5] bg-[#FFFCF7] p-5 shadow-[0_8px_25px_rgba(37,40,39,0.035)]"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <h3 className="text-xl font-black capitalize">
                      {road}
                    </h3>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                        data.signal_state === "green"
                          ? "bg-[#E7F3EA] text-[#4E7F59]"
                          : data.signal_state === "amber"
                          ? "bg-[#F8EFD9] text-[#9A742A]"
                          : "bg-[#F6E5E5] text-[#A85050]"
                      }`}
                    >
                      {data.signal_state}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <Metric label="Vehicles" value={data.vehicle_count} />
                    <Metric label="Queue" value={data.queue_length} />
                    <Metric
                      label="Speed"
                      value={`${data.avg_speed_kmph} km/h`}
                    />
                    <Metric
                      label="Waiting"
                      value={`${data.avg_wait_time_s} sec`}
                    />

                    <div className="border-t border-[#E9E4DC] pt-3">
                      <p className="text-xs text-[#8A8E8A]">
                        Signal time remaining
                      </p>
                      <p className="mt-1 text-xl font-black text-[#7A4E6D]">
                        {data.phase_time_remaining_s}s
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* APPLE-STYLE FLOATING DOCK */}
      <NavigationDock />
    </div>
  );
}

/* ---------- Navigation + motion ---------- */

function RoadSafetySlider() {
  const slogans = [
    "DRIVE SMART. ARRIVE SAFE.",
    "SLOW DOWN. STAY IN CONTROL.",
    "KEEP YOUR DISTANCE.",
    "RED MEANS STOP.",
    "GREEN MEANS GO. SAFELY.",
    "BUCKLE UP. EVERY TRIP.",
    "DON’T TEXT. DRIVE.",
    "LET THE FLOW WORK FOR YOU.",
  ];

  return (
    <div className="w-full overflow-hidden py-2">
      <InfiniteSlider gap={40} reverse>
        {slogans.map((slogan) => (
          <div
            key={slogan}
            className="flex h-12 shrink-0 items-center rounded-full border border-[#DED8CF] bg-[#FFFCF7] px-7 text-sm font-bold tracking-[0.08em] text-[#7A4E6D] shadow-sm"
          >
            {slogan}
          </div>
        ))}
      </InfiniteSlider>
    </div>
  );
}

function NavigationDock() {
  const items = [
    {
      title: "Live flow",
      target: "top",
      icon: <Activity className="h-full w-full" />,
    },
    {
      title: "Corridor",
      target: "corridor",
      icon: <Route className="h-full w-full" />,
    },
    
    {
      title: "Emergency",
      target: "emergency",
      icon: <Siren className="h-full w-full" />,
    },
    {
      title: "Compare",
      target: "strategy",
      icon: <GitCompareArrows className="h-full w-full" />,
    },
    {
      title: "Traffic data",
      target: "traffic",
      icon: <BarChart3 className="h-full w-full" />,
    },
  ];

  const scrollTo = (target: string) => {
    if (target === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    document.getElementById(target)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 max-w-[calc(100vw-24px)] -translate-x-1/2">
      <Dock className="pointer-events-auto items-end border border-[#DED8CF] bg-[#FFFCF7]/95 pb-3 shadow-[0_12px_35px_rgba(37,40,39,0.14)] backdrop-blur-md">
        {items.map((item) => (
          <DockItem
            key={item.title}
            className="aspect-square rounded-full bg-[#F0ECE5] text-[#68706D] transition-colors hover:bg-[#E8E0E7] hover:text-[#7A4E6D]"
            onClick={() => scrollTo(item.target)}
          >
            <DockLabel>{item.title}</DockLabel>
            <DockIcon>
              {item.icon}
            </DockIcon>
          </DockItem>
        ))}
      </Dock>
    </div>
  );
}

/* ---------- Reusable UI ---------- */

function ControlGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold text-[#8A8E8A]">
        {label}
      </p>

      <div className="flex items-center rounded-xl border border-[#DED8CF] bg-[#F3F0EA] p-1">
        {children}
      </div>
    </div>
  );
}

function controlButton(selected: boolean) {
  return `rounded-lg px-4 py-2 text-sm font-bold transition ${
    selected
      ? "bg-[#7A4E6D] text-white"
      : "text-[#68706D] hover:bg-[#EDE9E1] hover:text-[#252827]"
  }`;
}

function PerformanceCard({
  label,
  value,
  detail,
  accent = false,
}: {
  label: string;
  value: string | number;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#E3DED5] bg-[#FFFCF7] p-5 shadow-[0_8px_25px_rgba(37,40,39,0.035)]">
      <p className="text-sm font-semibold text-[#68706D]">
        {label}
      </p>

      <p
        className={`mt-2 text-4xl font-black tracking-[-0.03em] ${
          accent ? "text-[#7A4E6D]" : "text-[#252827]"
        }`}
      >
        {value}
      </p>

      <p className="mt-1 text-xs text-[#8A8E8A]">
        {detail}
      </p>
    </div>
  );
}

function ComparisonCard({
  metric,
  fixed,
  adaptive,
}: {
  metric: string;
  fixed: string;
  adaptive: string;
}) {
  return (
    <div className="rounded-xl border border-[#E3DED5] bg-[#F8F5EF] p-5">
      <p className="mb-4 text-sm font-semibold text-[#68706D]">
        {metric}
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-[#8A8E8A]">Fixed</p>
          <p className="mt-1 text-xl font-black text-[#252827]">
            {fixed}
          </p>
        </div>

        <div>
          <p className="text-xs text-[#8A8E8A]">Adaptive</p>
          <p className="mt-1 text-xl font-black text-[#7A4E6D]">
            {adaptive}
          </p>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-[#68706D]">{label}</span>
      <span className="text-base font-bold text-[#252827]">
        {value}
      </span>
    </div>
  );
}

/* ---------- Corridor visual ---------- */

function CorridorIntersection({
  label,
  side,
  traffic,
  currentGreenRoad,
  phaseTime,
  inboundCount,
  showPreGreen,
}: {
  label: "A" | "B";
  side: "left" | "right";
  traffic: TrafficState;
  currentGreenRoad: RoadName;
  phaseTime: number;
  inboundCount: number;
  showPreGreen: boolean;
}) {
  const position =
    side === "left"
      ? "left-[3%] sm:left-[7%]"
      : "right-[3%] sm:right-[7%]";

  /*
   * On B, the east-facing inbound signal is deliberately shown green
   * during the pre-green demonstration. This is the visual proof point.
   */
  const eastSignal: SignalState =
    showPreGreen ? "green" : traffic.roads.east.signal_state;

  return (
    <div
      className={`absolute top-1/2 z-10 h-[300px] w-[300px] -translate-y-1/2 ${position} sm:h-[335px] sm:w-[335px]`}
    >
      <div className="absolute inset-0 overflow-hidden rounded-[28px] bg-[#5B5E5B] shadow-[0_12px_35px_rgba(37,40,39,0.14)]">

        {/* vertical road */}
        <div className="absolute left-1/2 top-0 h-full w-[106px] -translate-x-1/2 bg-[#5B5E5B]" />

        {/* horizontal road */}
        <div className="absolute left-0 top-1/2 h-[106px] w-full -translate-y-1/2 bg-[#5B5E5B]" />

        {/* lane markings */}
        <div className="absolute left-1/2 top-0 h-[34%] -translate-x-1/2 border-l-2 border-dashed border-[#D1CEC6]/55" />
        <div className="absolute bottom-0 left-1/2 h-[34%] -translate-x-1/2 border-l-2 border-dashed border-[#D1CEC6]/55" />
        <div className="absolute left-0 top-1/2 w-[34%] -translate-y-1/2 border-t-2 border-dashed border-[#D1CEC6]/55" />
        <div className="absolute right-0 top-1/2 w-[34%] -translate-y-1/2 border-t-2 border-dashed border-[#D1CEC6]/55" />

        {/* crosswalks */}
        <Crosswalk className="left-[23%] top-[37%]" />
        <Crosswalk className="right-[23%] top-[37%]" />
        <Crosswalk className="left-[23%] bottom-[37%]" />
        <Crosswalk className="right-[23%] bottom-[37%]" />

        {/* center island */}
        <div className="absolute left-1/2 top-1/2 h-[76px] w-[76px] -translate-x-1/2 -translate-y-1/2 rounded-[18px] bg-[#6B6E6A] ring-1 ring-[#8A8C86]">
          <div className="absolute inset-3 rounded-xl bg-[#747771]" />
        </div>

        {/* signals */}
        <div className="absolute left-1/2 top-3 -translate-x-1/2">
          <Signal state={traffic.roads.north.signal_state} />
        </div>

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
          <Signal state={traffic.roads.south.signal_state} />
        </div>

        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <Signal state={traffic.roads.west.signal_state} />
        </div>

        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Signal state={eastSignal} />
        </div>

        {/* label */}
        <div className="absolute left-4 top-4 rounded-full bg-[#FFFCF7] px-3 py-1.5 text-sm font-black shadow-sm">
          {label}
        </div>

        {/* inbound count */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 ${
            side === "left" ? "right-[-4px]" : "left-[-4px]"
          }`}
        >
          <div className="flex items-center gap-1.5 rounded-full border border-[#D8C8D3] bg-[#FFFCF7] px-3 py-1.5 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#7A4E6D]" />
            <span className="whitespace-nowrap text-xs font-bold text-[#252827]">
              {inboundCount} inbound
            </span>
          </div>
        </div>

        {/* timer */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-[#252827]/90 px-3 py-1 text-xs font-bold text-white">
          {showPreGreen
            ? "Preparing"
            : `${currentGreenRoad} · ${phaseTime}s`}
        </div>

        {showPreGreen && (
          <div className="absolute right-4 top-4 rounded-full border border-[#C7DEC9] bg-[#EEF7EF] px-2.5 py-1 text-[11px] font-bold text-[#4E7F59]">
            Pre-green
          </div>
        )}
      </div>
    </div>
  );
}

function Crosswalk({ className }: { className: string }) {
  return (
    <div className={`absolute flex gap-1 ${className}`}>
      {[0, 1, 2, 3, 4].map((item) => (
        <span
          key={item}
          className="h-1.5 w-3 rounded-full bg-[#D7D4CC]/75"
        />
      ))}
    </div>
  );
}

function Signal({ state }: { state: SignalState }) {
  return (
    <div className="flex gap-1.5 rounded-lg border border-[#404340] bg-[#252827] p-2 shadow-sm">
      <div
        className={`h-3.5 w-3.5 rounded-full ${
          state === "red" ? "bg-[#D94B4B]" : "bg-[#565A57]"
        }`}
      />

      <div
        className={`h-3.5 w-3.5 rounded-full ${
          state === "amber" ? "bg-[#D99A35]" : "bg-[#565A57]"
        }`}
      />

      <div
        className={`h-3.5 w-3.5 rounded-full ${
          state === "green" ? "bg-[#4E9B68]" : "bg-[#565A57]"
        }`}
      />
    </div>
  );
}

function calculateGreenTime(
  mode: "fixed" | "adaptive",
  road: {
    vehicle_count: number;
    queue_length: number;
  }
) {
  if (mode === "fixed") {
    return 30;
  }

  const trafficScore =
    road.vehicle_count + road.queue_length * 2;

  const greenTime = Math.round(
    15 + trafficScore * 0.5
  );

  return Math.max(15, Math.min(60, greenTime));
}

export default App;
