import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { mockTrafficState } from "./mockData";
import type { TrafficState, RoadName } from "./types";

function App() {
  const [traffic, setTraffic] = useState<TrafficState>(mockTrafficState);
  const [isRunning, setIsRunning] = useState(false);
  const [currentGreenRoad, setCurrentGreenRoad] =
  useState<RoadName>("north");

const [signalPhase, setSignalPhase] =
  useState<"green" | "amber" | "all-red">("green");

const [phaseTime, setPhaseTime] = useState(24);
  const comparisonData = [
  {
    metric: "Wait Time",
    Fixed: 42.6,
    Adaptive: 31.4,
  },
  {
    metric: "Queue",
    Fixed: 16.8,
    Adaptive: 11.2,
  },
  {
    metric: "Throughput",
    Fixed: 184,
    Adaptive: 221,
  },
];
const roadData = Object.values(traffic.roads);

const totalVehicles = roadData.reduce(
  (sum, road) => sum + road.vehicle_count,
  0
);

const averageQueue =
  roadData.reduce((sum, road) => sum + road.queue_length, 0) /
  roadData.length;

const averageSpeed =
  roadData.reduce((sum, road) => sum + road.avg_speed_kmph, 0) /
  roadData.length;

const averageWaitTime =
  roadData.reduce((sum, road) => sum + road.avg_wait_time_s, 0) /
  roadData.length;

  useEffect(() => {
  if (!isRunning) return;

  const timer = setInterval(() => {
    setTraffic((current) => {
      const roadOrder: RoadName[] = [
        "north",
        "east",
        "south",
        "west",
      ];

      const currentIndex = roadOrder.indexOf(currentGreenRoad);

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
      }

      else if (signalPhase === "amber") {
        if (phaseTime > 1) {
          nextPhaseTime = phaseTime - 1;
        } else {
          nextPhase = "all-red";
          nextPhaseTime = 2;
        }
      }

      else if (signalPhase === "all-red") {
  if (phaseTime > 1) {
    nextPhaseTime = phaseTime - 1;
  } else {

    // Emergency gets priority after the safe all-red phase
    if (
      current.emergency.active &&
      current.emergency.direction !== null
    ) {
      nextGreenRoad = current.emergency.direction;
    } else {
      // Normal signal rotation
      nextGreenRoad =
        roadOrder[(currentIndex + 1) % roadOrder.length];
    }

    nextPhase = "green";

    nextPhaseTime = calculateGreenTime(
      current.mode,
      current.roads[nextGreenRoad]
    );
  }
}

      setCurrentGreenRoad(nextGreenRoad);
      setSignalPhase(nextPhase);
      setPhaseTime(nextPhaseTime);

      const updatedRoads = Object.fromEntries(
        Object.entries(current.roads).map(([road, data]) => {
          const roadName = road as RoadName;

          let newSignalState: "red" | "green" | "amber" = "red";
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

          if (
            nextPhase === "all-red"
          ) {
            newSignalState = "red";
            newTimer = nextPhaseTime;
          }

          const vehicleChange =
            Math.floor(Math.random() * 5) - 2;

          const newVehicleCount = Math.max(
            0,
            data.vehicle_count + vehicleChange
          );

          const newQueueLength = Math.max(
            0,
            data.queue_length +
              Math.floor(Math.random() * 3) - 1
          );

          const newSpeed = Math.max(
            5,
            Math.min(
              60,
              data.avg_speed_kmph +
                (Math.random() * 4 - 2)
            )
          );

          const newWaitTime = Math.max(
            0,
            data.avg_wait_time_s +
              (Math.random() * 4 - 2)
          );

          return [
            road,
            {
              ...data,

              vehicle_count: newVehicleCount,

              queue_length: newQueueLength,

              avg_speed_kmph:
                Number(newSpeed.toFixed(1)),

              avg_wait_time_s:
                Number(newWaitTime.toFixed(1)),

              signal_state: newSignalState,

              phase_time_remaining_s: newTimer,
            },
          ];
        })
      );

      return {
        ...current,

        timestamp: current.timestamp + 1,

        roads:
          updatedRoads as TrafficState["roads"],

        emergency:
          current.emergency.active &&
          current.emergency.eta_s !== null
            ? {
                ...current.emergency,
                eta_s: Math.max(
                  0,
                  current.emergency.eta_s - 1
                ),
              }
            : current.emergency,
      };
    });
  }, 1000);

  return () => clearInterval(timer);
}, [
  isRunning,
  currentGreenRoad,
  signalPhase,
  phaseTime,
]);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">

      {/* HEADER */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-cyan-400">
            AI TrafficFlow
          </h1>

          <p className="text-slate-400 mt-1">
            Intelligent Traffic Management System
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-lg">
          <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full"></div>
          <span className="text-emerald-400 text-sm font-semibold">
            SYSTEM ONLINE
          </span>
        </div>
      </header>


      {/* TOP STATUS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-slate-400 text-sm">MODE</p>
          <p className="text-2xl font-bold text-cyan-400 mt-2 uppercase">
            {traffic.mode}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-slate-400 text-sm">WEATHER</p>
          <p className="text-2xl font-bold text-white mt-2">
            {traffic.weather.replace("_", " ")}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-slate-400 text-sm">SIMULATION TIME</p>
          <p className="text-2xl font-bold text-white mt-2">
            {traffic.timestamp}s
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-slate-400 text-sm">EMERGENCY</p>
          <p
            className={`text-2xl font-bold mt-2 ${
              traffic.emergency.active
                ? "text-red-400"
                : "text-emerald-400"
            }`}
          >
            {traffic.emergency.active ? "ACTIVE" : "CLEAR"}
          </p>
        </div>

      </div>
     {/* SIMULATION CONTROLS */}
<div className="flex flex-wrap items-end justify-between gap-6 mb-8">

  {/* START / STOP / RESET */}
  <div className="flex flex-wrap items-center gap-3">

    <button
      onClick={() => setIsRunning(true)}
      className="px-5 py-2.5 rounded-lg bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 opacity-75 hover:opacity-100 transition-all duration-150 ease-out active:opacity-100 active:translate-y-[4px] active:scale-[0.97] active:brightness-125 active:shadow-[0_0_8px_rgba(255,255,255,0.45),0_0_18px_rgba(255,255,255,0.30),0_0_30px_rgba(255,255,255,0.18)]"
    >
      ▶ START
    </button>

    <button
      onClick={() => setIsRunning(false)}
      className="px-5 py-2.5 rounded-lg bg-red-500 text-white font-bold hover:bg-red-400 opacity-75 hover:opacity-100 transition-all duration-150 ease-out active:opacity-100 active:translate-y-[4px] active:scale-[0.97] active:brightness-125 active:shadow-[0_0_8px_rgba(255,255,255,0.45),0_0_18px_rgba(255,255,255,0.30),0_0_30px_rgba(255,255,255,0.18)]"
    >
      ■ STOP
    </button>

    <button
      onClick={() => {
  setIsRunning(false);
  setTraffic(mockTrafficState);

  setCurrentGreenRoad("north");
  setSignalPhase("green");
  setPhaseTime(24);
}}
      className="px-5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold hover:bg-slate-700 opacity-75 hover:opacity-100 transition-all duration-150 ease-out active:opacity-100 active:translate-y-[4px] active:scale-[0.97] active:brightness-125 active:shadow-[0_0_8px_rgba(255,255,255,0.45),0_0_18px_rgba(255,255,255,0.30),0_0_30px_rgba(255,255,255,0.18)]"
    >
      ↻ RESET
    </button>

  </div>


  {/* MODE + WEATHER */}
  <div className="flex flex-wrap items-end gap-4">

    {/* SIGNAL MODE */}
    <div>
      <p className="text-xs text-slate-500 font-semibold mb-1.5">
        SIGNAL MODE
      </p>

      <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg p-1">

        <button
          onClick={() =>
            setTraffic((current) => ({
              ...current,
              mode: "fixed",
            }))
          }
          className={`px-4 py-2 rounded-md text-sm font-bold ${ traffic.mode === "fixed" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white" } opacity-75 hover:opacity-100 transition-all duration-150 ease-out active:opacity-100 active:translate-y-[4px] active:scale-[0.97] active:brightness-125 active:shadow-[0_0_8px_rgba(255,255,255,0.45),0_0_18px_rgba(255,255,255,0.30),0_0_30px_rgba(255,255,255,0.18)]`}
        >
          FIXED
        </button>

        <button
          onClick={() =>
            setTraffic((current) => ({
              ...current,
              mode: "adaptive",
            }))
          }
          className={`px-4 py-2 rounded-md text-sm font-bold ${ traffic.mode === "adaptive" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white" } opacity-75 hover:opacity-100 transition-all duration-150 ease-out active:opacity-100 active:translate-y-[4px] active:scale-[0.97] active:brightness-125 active:shadow-[0_0_8px_rgba(255,255,255,0.45),0_0_18px_rgba(255,255,255,0.30),0_0_30px_rgba(255,255,255,0.18)]`}
        >
          ADAPTIVE
        </button>

      </div>
    </div>


    {/* WEATHER */}
    <div>
      <p className="text-xs text-slate-500 font-semibold mb-1.5">
        WEATHER
      </p>

      <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg p-1">

        <button
          onClick={() =>
            setTraffic((current) => ({
              ...current,
              weather: "normal",
            }))
          }
          className={`px-4 py-2 rounded-md text-sm font-bold ${ traffic.weather === "normal" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white" } opacity-75 hover:opacity-100 transition-all duration-150 ease-out active:opacity-100 active:translate-y-[4px] active:scale-[0.97] active:brightness-125 active:shadow-[0_0_8px_rgba(255,255,255,0.45),0_0_18px_rgba(255,255,255,0.30),0_0_30px_rgba(255,255,255,0.18)]`}
        >
          NORMAL
        </button>

        <button
          onClick={() =>
            setTraffic((current) => ({
              ...current,
              weather: "light_rain",
            }))
          }
          className={`px-4 py-2 rounded-md text-sm font-bold ${ traffic.weather === "light_rain" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white" } opacity-75 hover:opacity-100 transition-all duration-150 ease-out active:opacity-100 active:translate-y-[4px] active:scale-[0.97] active:brightness-125 active:shadow-[0_0_8px_rgba(255,255,255,0.45),0_0_18px_rgba(255,255,255,0.30),0_0_30px_rgba(255,255,255,0.18)]`}
        >
          LIGHT RAIN
        </button>

        <button
          onClick={() =>
            setTraffic((current) => ({
              ...current,
              weather: "heavy_rain",
            }))
          }
          className={`px-4 py-2 rounded-md text-sm font-bold ${ traffic.weather === "heavy_rain" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white" } opacity-75 hover:opacity-100 transition-all duration-150 ease-out active:opacity-100 active:translate-y-[4px] active:scale-[0.97] active:brightness-125 active:shadow-[0_0_8px_rgba(255,255,255,0.45),0_0_18px_rgba(255,255,255,0.30),0_0_30px_rgba(255,255,255,0.18)]`}
        >
          HEAVY RAIN
        </button>

      </div>
    </div>

  </div>


  {/* SIMULATION STATUS */}
  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 border border-slate-800">

    <div
      className={`w-2.5 h-2.5 rounded-full ${
        isRunning ? "bg-emerald-400" : "bg-slate-500"
      }`}
    />

    <span className="text-sm font-semibold whitespace-nowrap">
      {isRunning
        ? "SIMULATION RUNNING"
        : "SIMULATION STOPPED"}
    </span>

  </div>

</div>


      {/* INTERSECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">
              Live Intersection
            </h2>

            <p className="text-slate-400 text-sm mt-1">
              Real-time traffic signal status
            </p>
          </div>

          <div className="text-cyan-400 text-sm font-semibold">
            4-WAY INTERSECTION
          </div>
        </div>


        {/* INTERSECTION VISUAL */}
        <div className="flex justify-center">

          <div className="relative w-[420px] h-[300px] bg-slate-800 rounded-xl overflow-hidden">

            {/* Roads */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-full bg-slate-700"></div>

            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-24 bg-slate-700"></div>

            {/* Center */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-slate-900 border border-slate-600 rounded-lg"></div>

            {/* North Signal */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
              <span className="text-xs font-bold text-slate-300">NORTH</span>
              <Signal state={traffic.roads.north.signal_state} />
            </div>

            {/* South Signal */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
              <Signal state={traffic.roads.south.signal_state} />
              <span className="text-xs font-bold text-slate-300">SOUTH</span>
            </div>

           {/* East Signal */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Signal state={traffic.roads.east.signal_state} />
              <span className="text-xs font-bold text-slate-300">EAST</span>
            </div>

            {/* West Signal */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <span className="text-xs font-bold text-slate-300">WEST</span>
              <Signal state={traffic.roads.west.signal_state} />
            </div>

          </div>

        </div>

      </div>
      {/* EMERGENCY CONTROL */}
<div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">

  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

    {/* TITLE */}
    <div>
      <h2 className="text-xl font-bold">
        Emergency Vehicle Priority
      </h2>

      <p className="text-slate-400 text-sm mt-1">
        Simulate an emergency vehicle approaching the intersection
      </p>
    </div>


    {/* CONTROLS */}
    <div className="flex flex-wrap items-center gap-2">

      {/* CLEAR */}
      <button
        onClick={() =>
          setTraffic((current) => ({
            ...current,
            emergency: {
              active: false,
              direction: null,
              eta_s: null,
            },
          }))
        }
        className={`px-4 py-2 rounded-lg text-sm font-bold ${ !traffic.emergency.active ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400 hover:text-white" } opacity-75 hover:opacity-100 transition-all duration-150 ease-out active:opacity-100 active:translate-y-[4px] active:scale-[0.97] active:brightness-125 active:shadow-[0_0_8px_rgba(255,255,255,0.45),0_0_18px_rgba(255,255,255,0.30),0_0_30px_rgba(255,255,255,0.18)]`}
      >
        OFF
      </button>


      {/* NORTH */}
      <button
        onClick={() =>
          setTraffic((current) => ({
            ...current,
            emergency: {
              active: true,
              direction: "north",
              eta_s: 15,
            },
          }))
        }
        className={`px-4 py-2 rounded-lg text-sm font-bold ${ traffic.emergency.direction === "north" ? "bg-red-500 text-white" : "bg-slate-800 text-slate-400 hover:text-white" } opacity-75 hover:opacity-100 transition-all duration-150 ease-out active:opacity-100 active:translate-y-[4px] active:scale-[0.97] active:brightness-125 active:shadow-[0_0_8px_rgba(255,255,255,0.45),0_0_18px_rgba(255,255,255,0.30),0_0_30px_rgba(255,255,255,0.18)]`}
      >
        NORTH
      </button>


      {/* EAST */}
      <button
        onClick={() =>
          setTraffic((current) => ({
            ...current,
            emergency: {
              active: true,
              direction: "east",
              eta_s: 15,
            },
          }))
        }
        className={`px-4 py-2 rounded-lg text-sm font-bold ${ traffic.emergency.direction === "east" ? "bg-red-500 text-white" : "bg-slate-800 text-slate-400 hover:text-white" } opacity-75 hover:opacity-100 transition-all duration-150 ease-out active:opacity-100 active:translate-y-[4px] active:scale-[0.97] active:brightness-125 active:shadow-[0_0_8px_rgba(255,255,255,0.45),0_0_18px_rgba(255,255,255,0.30),0_0_30px_rgba(255,255,255,0.18)]`}
      >
        EAST
      </button>


      {/* SOUTH */}
      <button
        onClick={() =>
          setTraffic((current) => ({
            ...current,
            emergency: {
              active: true,
              direction: "south",
              eta_s: 15,
            },
          }))
        }
        className={`px-4 py-2 rounded-lg text-sm font-bold ${ traffic.emergency.direction === "south" ? "bg-red-500 text-white" : "bg-slate-800 text-slate-400 hover:text-white" } opacity-75 hover:opacity-100 transition-all duration-150 ease-out active:opacity-100 active:translate-y-[4px] active:scale-[0.97] active:brightness-125 active:shadow-[0_0_8px_rgba(255,255,255,0.45),0_0_18px_rgba(255,255,255,0.30),0_0_30px_rgba(255,255,255,0.18)]`}
      >
        SOUTH
      </button>


      {/* WEST */}
      <button
        onClick={() =>
          setTraffic((current) => ({
            ...current,
            emergency: {
              active: true,
              direction: "west",
              eta_s: 15,
            },
          }))
        }
        className={`px-4 py-2 rounded-lg text-sm font-bold ${ traffic.emergency.direction === "west" ? "bg-red-500 text-white" : "bg-slate-800 text-slate-400 hover:text-white" } opacity-75 hover:opacity-100 transition-all duration-150 ease-out active:opacity-100 active:translate-y-[4px] active:scale-[0.97] active:brightness-125 active:shadow-[0_0_8px_rgba(255,255,255,0.45),0_0_18px_rgba(255,255,255,0.30),0_0_30px_rgba(255,255,255,0.18)]`}
      >
        WEST
      </button>

    </div>

  </div>


  {/* ACTIVE EMERGENCY INFO */}
  {traffic.emergency.active && (
    <div className="mt-5 flex flex-wrap items-center gap-6 bg-red-500/10 border border-red-500/30 rounded-lg px-5 py-4">

      <div>
        <p className="text-xs text-red-300">
          STATUS
        </p>

        <p className="text-lg font-bold text-red-400">
          EMERGENCY ACTIVE
        </p>
      </div>

      <div>
        <p className="text-xs text-slate-500">
          DIRECTION
        </p>

        <p className="text-lg font-bold text-white uppercase">
          {traffic.emergency.direction}
        </p>
      </div>

      <div>
        <p className="text-xs text-slate-500">
          ETA
        </p>

        <p className="text-lg font-bold text-cyan-400">
          {traffic.emergency.eta_s}s
        </p>
      </div>

    </div>
  )}

</div>
      {/* LIVE PERFORMANCE */}
<div className="mb-8">

  <div className="mb-4">
    <h2 className="text-2xl font-bold">
      Live Performance
    </h2>

    <p className="text-slate-400 text-sm mt-1">
      Current traffic conditions across all roads
    </p>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <p className="text-slate-400 text-sm">
        TOTAL VEHICLES
      </p>

      <p className="text-3xl font-bold text-cyan-400 mt-2">
        {totalVehicles}
      </p>
    </div>

    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <p className="text-slate-400 text-sm">
        AVG QUEUE
      </p>

      <p className="text-3xl font-bold text-white mt-2">
        {averageQueue.toFixed(1)}
      </p>

      <p className="text-xs text-slate-500 mt-1">
        vehicles
      </p>
    </div>

    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <p className="text-slate-400 text-sm">
        AVG SPEED
      </p>

      <p className="text-3xl font-bold text-white mt-2">
        {averageSpeed.toFixed(1)}
      </p>

      <p className="text-xs text-slate-500 mt-1">
        km/h
      </p>
    </div>

    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <p className="text-slate-400 text-sm">
        AVG WAIT TIME
      </p>

      <p className="text-3xl font-bold text-white mt-2">
        {averageWaitTime.toFixed(1)}
      </p>

      <p className="text-xs text-slate-500 mt-1">
        seconds
      </p>
    </div>

  </div>

</div>
      {/* FIXED VS ADAPTIVE COMPARISON */}
<div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">

  <div className="mb-6">
    <h2 className="text-2xl font-bold">
      Fixed vs Adaptive
    </h2>

    <p className="text-slate-400 text-sm mt-1">
      Compare traffic performance under different signal strategies
    </p>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

    <ComparisonCard
      metric="Average Wait Time"
      fixed="42.6 s"
      adaptive="31.4 s"
    />

    <ComparisonCard
      metric="Average Queue"
      fixed="16.8"
      adaptive="11.2"
    />

    <ComparisonCard
      metric="Throughput"
      fixed="184 veh/hr"
      adaptive="221 veh/hr"
    />

  </div>
  <div className="mt-8 h-80">

  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={comparisonData}>

      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />

      <XAxis
        dataKey="metric"
        stroke="#94a3b8"
      />

      <YAxis
        stroke="#94a3b8"
      />

      <Tooltip
        contentStyle={{
          backgroundColor: "#0f172a",
          border: "1px solid #334155",
          borderRadius: "8px",
          color: "#ffffff",
        }}
      />

      <Bar
        dataKey="Fixed"
        fill="#64748b"
        radius={[4, 4, 0, 0]}
      />

      <Bar
        dataKey="Adaptive"
        fill="#22d3ee"
        radius={[4, 4, 0, 0]}
      />

    </BarChart>
  </ResponsiveContainer>

</div>

</div>


      {/* ROAD CARDS */}
      <h2 className="text-2xl font-bold mb-4">
        Traffic State
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {(Object.keys(traffic.roads) as Array<keyof typeof traffic.roads>).map(
          (road) => {
            const data = traffic.roads[road];

            return (
              <div
                key={road}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5"
              >

                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xl font-bold uppercase">
                    {road}
                  </h3>

                  <span
                    className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                      data.signal_state === "green"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : data.signal_state === "amber"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {data.signal_state}
                  </span>
                </div>


                <div className="space-y-4">

                  <Metric
                    label="Vehicles"
                    value={data.vehicle_count}
                  />

                  <Metric
                    label="Queue"
                    value={data.queue_length}
                  />

                  <Metric
                    label="Speed"
                    value={`${data.avg_speed_kmph} km/h`}
                  />

                  <Metric
                    label="Waiting"
                    value={`${data.avg_wait_time_s} sec`}
                  />

                  <div className="pt-3 border-t border-slate-800">
                    <p className="text-slate-500 text-xs">
                      SIGNAL TIME REMAINING
                    </p>

                    <p className="text-cyan-400 text-xl font-bold mt-1">
                      {data.phase_time_remaining_s}s
                    </p>
                  </div>

                </div>

              </div>
            );
          }
        )}

      </div>

    </div>
  );
}


/* SIGNAL COMPONENT */
function Signal({ state }: { state: "red" | "green" | "amber" }) {
  return (
    <div className="bg-slate-950 border border-slate-600 rounded-lg p-2 flex gap-1.5">
      <div
        className={`w-4 h-4 rounded-full ${
          state === "red" ? "bg-red-500" : "bg-slate-700"
        }`}
      />

      <div
        className={`w-4 h-4 rounded-full ${
          state === "amber" ? "bg-amber-400" : "bg-slate-700"
        }`}
      />

      <div
        className={`w-4 h-4 rounded-full ${
          state === "green" ? "bg-emerald-400" : "bg-slate-700"
        }`}
      />
    </div>
  );
}


/* METRIC COMPONENT */
function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-400">{label}</span>

      <span className="text-base font-semibold text-white">{value}</span>
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
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-5">

      <p className="text-slate-400 text-sm mb-4">
        {metric}
      </p>

      <div className="grid grid-cols-2 gap-4">

        <div>
          <p className="text-xs text-slate-500">
            FIXED
          </p>

          <p className="text-xl font-bold text-white mt-1">
            {fixed}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">
            ADAPTIVE
          </p>

          <p className="text-xl font-bold text-cyan-400 mt-1">
            {adaptive}
          </p>
        </div>

      </div>

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
  // Fixed mode always uses 30 seconds
  if (mode === "fixed") {
    return 30;
  }

  // Adaptive mode gives more time to busier roads
  const trafficScore =
    road.vehicle_count + road.queue_length * 2;

  const greenTime = Math.round(
    15 + trafficScore * 0.5
  );

  return Math.max(
    15,
    Math.min(60, greenTime)
  );
}


export default App;