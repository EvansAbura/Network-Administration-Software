import React, { useState, useEffect } from "react";
import { 
  NetworkDevice, 
  NetworkAlert, 
  UserRole,
  ThresholdConfig 
} from "../types";
import { 
  Activity, 
  Cpu, 
  AlertTriangle, 
  Server, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Sparkles,
  RefreshCw,
  Clock,
  ShieldAlert
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  LineChart, 
  Line, 
  BarChart, 
  Bar,
  Legend
} from "recharts";

interface DashboardProps {
  devices: NetworkDevice[];
  alerts: NetworkAlert[];
  role: UserRole;
  onNavigate: (tab: string) => void;
  onRefreshAll: () => void;
}

export default function NetworkDashboard({ 
  devices, 
  alerts, 
  role, 
  onNavigate,
  onRefreshAll 
}: DashboardProps) {
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);

  // Generate mock sliding timeline chart telemetry to preserve active user session look
  useEffect(() => {
    const historicalPoints = [];
    let now = Date.now();
    for (let i = 15; i >= 0; i--) {
      const timeStr = new Date(now - i * 5000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      historicalPoints.push({
        time: timeStr,
        ingress: +(180 + Math.random() * 40 - 20).toFixed(1),
        egress: +(160 + Math.random() * 30 - 15).toFixed(1),
        latency: +(20 + Math.random() * 6).toFixed(1),
        cpuAvg: Math.round(30 + Math.random() * 15)
      });
    }
    setTimeSeriesData(historicalPoints);
  }, []);

  // Update real-time metrics dynamically every 5 seconds to match backend intervals
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSeriesData(prev => {
        const nextTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        // Sum total simulated ingress
        const totIn = devices.reduce((sum, d) => sum + d.bandwidthIn, 0);
        const totOut = devices.reduce((sum, d) => sum + d.bandwidthOut, 0);
        const avgLat = +(devices.reduce((sum, d) => sum + d.pingLatency, 0) / (devices.length || 1)).toFixed(1);
        const avgCpu = Math.round(devices.reduce((sum, d) => sum + d.cpuUsage, 0) / (devices.length || 1));

        const nextPoint = {
          time: nextTime,
          ingress: +totIn.toFixed(1),
          egress: +totOut.toFixed(1),
          latency: avgLat,
          cpuAvg: avgCpu
        };

        const updated = [...prev.slice(1), nextPoint];
        return updated;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [devices]);

  // Handle server-side Gemini QoS Advice Fetch
  const fetchAiOptimizations = async () => {
    setLoadingAi(true);
    setAiAnalysis("");
    try {
      const resp = await fetch("/api/gemini/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await resp.json();
      if (data.analysis) {
        setAiAnalysis(data.analysis);
      } else if (data.error) {
        setAiAnalysis(`AI Error: ${data.error}. Please check configuration.`);
      }
    } catch (err: any) {
      setAiAnalysis(`Failed connecting to secure AI advice gateway.`);
    } finally {
      setLoadingAi(false);
    }
  };

  // Pre-calculated stats
  const totalCount = devices.length;
  const criticalCount = devices.filter(d => d.status === 'critical').length;
  const warningCount = devices.filter(d => d.status === 'warning').length;
  const healthyCount = devices.filter(d => d.status === 'healthy').length;
  const unackAlerts = alerts.filter(a => !a.acknowledged).length;

  const totalInBandwidth = devices.reduce((sum, d) => sum + d.bandwidthIn, 0);
  const totalOutBandwidth = devices.reduce((sum, d) => sum + d.bandwidthOut, 0);
  
  const avgCpu = Math.round(devices.reduce((sum, d) => sum + d.cpuUsage, 0) / (devices.length || 1));
  const avgRam = Math.round(devices.reduce((sum, d) => sum + d.ramUsage, 0) / (devices.length || 1));

  return (
    <div className="space-y-6">
      {/* Upper NOC Ribbon */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0F1219] p-4 rounded-xl border border-slate-800 shadow-sm shadow-black/20">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="text-indigo-400 animate-pulse" />
            NOC Control Center
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Real-time monitoring console for enterprise LAN/WAN routers, firewalls, and hypervisors.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs bg-indigo-600/10 px-2.5 py-1.5 rounded-lg border border-indigo-800/40 text-indigo-400">
            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping"></span>
            ROLE: {role.toUpperCase()}
          </div>
          <button 
            onClick={onRefreshAll}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs px-3 py-1.5 rounded-lg font-medium border border-slate-700/80 transition-all cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Grid Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-[#0F1219] p-5 rounded-xl border border-slate-800 relative overflow-hidden flex flex-col justify-between min-h-[110px] shadow-sm shadow-black/20">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-xs font-medium tracking-wide">GLOBAL DEPLOYMENT</span>
            <Server className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white mt-2 flex items-baseline gap-2">
              {totalCount}
              <span className="text-slate-500 text-xs font-normal">Active hosts</span>
            </div>
            <div className="flex gap-2.5 text-[10px] mt-1.5 font-mono">
              <span className="text-emerald-400">● {healthyCount} OK</span>
              <span className="text-amber-400">● {warningCount} Warn</span>
              <span className="text-rose-400">● {criticalCount} Crit</span>
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#0F1219] p-5 rounded-xl border border-slate-800 relative overflow-hidden flex flex-col justify-between min-h-[110px] shadow-sm shadow-black/20">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-xs font-medium tracking-wide">ACTIVE INTEGRATED ALERTS</span>
            <AlertTriangle className={`h-5 w-5 ${unackAlerts > 0 ? 'text-amber-500 animate-bounce' : 'text-slate-500'}`} />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white mt-2 flex items-baseline gap-2">
              {unackAlerts}
              <span className="text-slate-500 text-xs font-normal">Unresolved issue logs</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-2 font-mono flex items-center gap-1">
              <Clock className="h-3 w-3 inline text-slate-500" />
              Recent breach triggered {alerts[0] ? new Date(alerts[0].timestamp).toLocaleTimeString() : 'N/A'}
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#0F1219] p-5 rounded-xl border border-slate-800 relative overflow-hidden flex flex-col justify-between min-h-[110px] shadow-sm shadow-black/20">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-xs font-medium tracking-wide">TOTAL EDGE THROUGHPUT</span>
            <div className="flex gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <TrendingDown className="h-4 w-4 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white mt-2">
              {+(totalInBandwidth + totalOutBandwidth).toFixed(1)} <span className="text-lg font-semibold text-slate-400">Mbps</span>
            </div>
            <div className="flex gap-3 text-[10px] mt-1.5 text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                In: {totalInBandwidth.toFixed(1)}M
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Out: {totalOutBandwidth.toFixed(1)}M
              </span>
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-[#0F1219] p-5 rounded-xl border border-slate-800 relative overflow-hidden flex flex-col justify-between min-h-[110px] shadow-sm shadow-black/20">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-xs font-medium tracking-wide">RESOURCE LOAD</span>
            <Cpu className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white mt-2 flex items-baseline gap-3">
              {avgCpu}% <span className="text-sm font-semibold text-slate-400">CPU</span>
              <span className="text-white text-3xl font-extrabold">/</span>
              {avgRam}% <span className="text-sm font-semibold text-slate-400">RAM</span>
            </div>
            <div className="mt-2.5 w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 rounded-full transition-all duration-1000" 
                style={{ width: `${avgCpu}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latency & Throughput graph */}
        <div className="bg-[#0F1219] p-5 rounded-xl border border-slate-800 lg:col-span-2 space-y-4 shadow-sm shadow-black/20">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-semibold text-white">Interface Traffic Aggregation Trends</h2>
              <p className="text-xs text-slate-400">Real-time throughput comparison over client poll periods</p>
            </div>
            <span className="text-[10px] bg-slate-800 px-2 py-1 rounded border border-slate-700 text-slate-300 font-mono">
              POLL RATE: 5s
            </span>
          </div>

          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData}>
                <defs>
                  <linearGradient id="colorIngress" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEgress" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" type="category" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} unit=" Mb" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', fontSize: 11 }} />
                <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Area type="monotone" name="Receive (Ingress)" dataKey="ingress" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorIngress)" />
                <Area type="monotone" name="Transmit (Egress)" dataKey="egress" stroke="#34d399" strokeWidth={2} fillOpacity={1} fill="url(#colorEgress)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Speed & Alert status Tickers */}
        <div className="bg-[#0F1219] p-5 rounded-xl border border-slate-800 flex flex-col justify-between shadow-sm shadow-black/20">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-white tracking-wide">Device Status Index</h3>
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping"></span>
            </div>

            <div className="space-y-3.5">
              {devices.slice(0, 5).map(dev => (
                <div key={dev.id} className="flex justify-between items-center text-xs bg-slate-950/40 p-2.5 rounded border border-slate-900">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${
                      dev.status === 'healthy' ? 'bg-emerald-500' : (dev.status === 'warning' ? 'bg-amber-400' : 'bg-rose-500')
                    }`}></span>
                    <span className="font-medium text-slate-200 truncate max-w-[120px]">{dev.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-400 font-mono text-[10px]">
                    <span>CPU: {dev.cpuUsage}%</span>
                    <span>{dev.pingLatency} ms</span>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => onNavigate("devices")}
              className="w-full py-2 bg-slate-800/80 text-slate-300 rounded border border-slate-700/60 hover:bg-slate-700/80 active:scale-[99%] text-xs font-medium cursor-pointer transition-all mt-2 text-center block"
            >
              Manage all {totalCount} network resources
            </button>
          </div>

          <div className="border-t border-slate-800/80 pt-4 mt-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">ANOMALOUS ACTIVITY CHECK</h4>
            {criticalCount > 0 ? (
              <div className="flex items-start gap-2 bg-rose-950/30 p-2.5 rounded border border-rose-900/40 text-rose-300 text-xs">
                <ShieldAlert className="h-4.5 w-4.5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{criticalCount} critical issues require attention</p>
                  <p className="text-[10px] text-rose-400/80 mt-0.5">Subnet connections blocked. Network delay in Postgres-DB bounds detected.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-emerald-950/30 p-2.5 rounded border border-emerald-900/40 text-emerald-300 text-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                <span>All core VLAN connections represent standard latency bounds.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Optimizations & Suggested Network Operations */}
      <div className="bg-[#0F1219] p-6 rounded-xl border border-slate-800 space-y-4 shadow-sm shadow-black/20">
        <div className="flex justify-between items-start">
          <div className="flex gap-2">
            <div className="bg-indigo-600/10 p-2 rounded-lg border border-indigo-800/20">
              <Sparkles className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                AI Automated QoS & Routing Advisor
              </h3>
              <p className="text-xs text-slate-400">
                Queries server-side Gemini 3.5 models with current topology data to calculate packet prioritization and trunk optimization advice.
              </p>
            </div>
          </div>
          <button
            onClick={fetchAiOptimizations}
            disabled={loadingAi}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:bg-indigo-800 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer transition-all border border-indigo-500/30"
          >
            {loadingAi ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Analyzing Topology...
              </>
            ) : (
              <>
                <Zap className="h-3.5 w-3.5 text-amber-300" />
                Generate AI Optimization Report
              </>
            )}
          </button>
        </div>

        {aiAnalysis ? (
          <div className="bg-slate-950/90 p-5 rounded-lg border border-slate-800 font-sans text-xs leading-relaxed text-slate-200 mt-2 animate-fadeIn max-h-[400px] overflow-y-auto">
            <div className="prose prose-invert prose-xs max-w-none">
              {aiAnalysis.split("\n").map((line, idx) => {
                if (line.startsWith("###")) {
                  return <h4 key={idx} className="text-sm font-bold text-white mt-3 mb-1.5 font-sans border-b border-indigo-950 pb-1 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-indigo-400" /> {line.replace(/###/g, "").trim()}</h4>;
                }
                if (line.startsWith("-") || line.startsWith("*")) {
                  return <li key={idx} className="ml-4 list-disc text-slate-300 mb-1">{line.replace(/^[-*]\s*/, "")}</li>;
                }
                if (line.trim() === "") return <p key={idx} className="h-2"></p>;
                // Highlight config ports or severe indicators
                const isNumericList = /^\d+\./.test(line);
                if (isNumericList) {
                  return <p key={idx} className="font-medium text-slate-100 mt-2 mb-1 pl-1">{line}</p>;
                }
                return <p key={idx} className="text-slate-300 mb-1">{line}</p>;
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-800 rounded-lg bg-slate-950/25">
            <p className="text-sm text-slate-500">Click the button above to request real-time diagnostics generated by Gemini.</p>
          </div>
        )}
      </div>
    </div>
  );
}
