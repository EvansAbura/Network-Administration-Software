import React, { useState, useEffect } from "react";
import { 
  NetworkDevice, 
  NetworkAlert, 
  SysLog, 
  FirewallRule, 
  ThresholdConfig, 
  UserRole,
  TopologyNode,
  TopologyLink 
} from "./types";

// Import modular layouts
import NetworkDashboard from "./components/NetworkDashboard";
import DevicesManager from "./components/DevicesManager";
import TopologyMap from "./components/TopologyMap";
import SecurityConsole from "./components/SecurityConsole";
import AlertsManager from "./components/AlertsManager";
import LogsExplorer from "./components/LogsExplorer";

// Icons 
import { 
  LayoutDashboard, 
  Smartphone,
  Server, 
  Network, 
  BellRing, 
  ShieldCheck, 
  FileLock, 
  Settings, 
  Activity, 
  RefreshCw, 
  User, 
  Wifi, 
  AlertTriangle,
  LogOut,
  Sliders,
  Database
} from "lucide-react";

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Global Context State
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [alerts, setAlerts] = useState<NetworkAlert[]>([]);
  const [logs, setLogs] = useState<SysLog[]>([]);
  const [firewallRules, setFirewallRules] = useState<FirewallRule[]>([]);
  const [thresholds, setThresholds] = useState<ThresholdConfig | null>(null);
  const [currentUser, setCurrentUser] = useState<{ username: string; role: UserRole }>({
    username: "evansabura1@gmail.com",
    role: "Admin"
  });

  const [topologyData, setTopologyData] = useState<{ nodes: TopologyNode[]; links: TopologyLink[] }>({
    nodes: [],
    links: []
  });

  // Global refresh indicator
  const [globalLoading, setGlobalLoading] = useState<boolean>(false);

  // FETCH HELPER CHANNELS
  const fetchAllTelemetry = async () => {
    try {
      setGlobalLoading(true);
      
      // Fetch user auth session
      const authResp = await fetch("/api/auth/session");
      const authData = await authResp.json();
      setCurrentUser(authData);

      // Fetch devices
      const devResp = await fetch("/api/devices");
      const devData = await devResp.json();
      setDevices(devData);

      // Fetch alerts
      const alertResp = await fetch("/api/alerts");
      const alertData = await alertResp.json();
      setAlerts(alertData);

      // Fetch logs
      const logResp = await fetch("/api/logs");
      const logData = await logResp.json();
      setLogs(logData);

      // Fetch firewalls
      const fwResp = await fetch("/api/firewall");
      const fwData = await fwResp.json();
      setFirewallRules(fwData);

      // Fetch thresholds
      const threshResp = await fetch("/api/thresholds");
      const threshData = await threshResp.json();
      setThresholds(threshData);

      // Fetch topology
      const topoResp = await fetch("/api/topology");
      const topoData = await topoResp.json();
      setTopologyData(topoData);

    } catch (err) {
      console.error("Failed compiling system telemetry endpoints.", err);
    } finally {
      setGlobalLoading(false);
    }
  };

  // Poll server updates every 5 seconds to provide real-time gauges / alerts lookups
  useEffect(() => {
    fetchAllTelemetry();

    const interval = setInterval(() => {
      // Lazy secondary polls
      const tick = async () => {
        try {
          const devResp = await fetch("/api/devices");
          const devData = await devResp.json();
          setDevices(devData);

          const alertResp = await fetch("/api/alerts");
          const alertData = await alertResp.json();
          setAlerts(alertData);

          const logResp = await fetch("/api/logs");
          const logData = await logResp.json();
          setLogs(logData);

          const topoResp = await fetch("/api/topology");
          const topoData = await topoResp.json();
          setTopologyData(topoData);
        } catch (e) {
          console.error("Poller link error", e);
        }
      };
      tick();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // MUTATION MUTEX ACTIONS

  // 1. Set Auth Role
  const handleSetRoleAction = async (targetRole: UserRole) => {
    try {
      const resp = await fetch("/api/auth/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRole })
      });
      const data = await resp.json();
      if (data.status === "success") {
        setCurrentUser(prev => ({ ...prev, role: data.role }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 2. Add Device
  const handleAddDeviceAction = async (newDevice: any) => {
    try {
      const resp = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDevice)
      });
      if (resp.ok) {
        await fetchAllTelemetry();
      } else {
        const err = await resp.json();
        alert(`Error registering hardware: ${err.error}`);
      }
    } catch (e) {
      console.error("Failed pushing element", e);
    }
  };

  // 3. Delete Device
  const handleDeleteDeviceAction = async (id: string) => {
    try {
      const resp = await fetch(`/api/devices/${id}`, { method: "DELETE" });
      if (resp.ok) {
        await fetchAllTelemetry();
      } else {
        const err = await resp.json();
        alert(`Error unlinking node: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 4. Reboot Device
  const handleRebootDeviceAction = async (id: string) => {
    try {
      const resp = await fetch(`/api/devices/reboot/${id}`, { method: "POST" });
      if (resp.ok) {
        await fetchAllTelemetry();
      } else {
        const err = await resp.json();
        alert(`Failed signaling reboot process: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 5. Trigger auto-discovery network sweep
  const handleTriggerSubnetScanAction = async (subnetRange: string) => {
    try {
      const resp = await fetch("/api/devices/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subnet: subnetRange })
      });
      if (resp.ok) {
        const data = await resp.json();
        await fetchAllTelemetry();
        return data.discoveredCount;
      } else {
        const err = await resp.json();
        alert(`Discovery filter block: ${err.error}`);
        return 0;
      }
    } catch (e) {
       console.error("Subnet scan exception", e);
       return 0;
    }
  };

  // 6. Update Node Coordinates layout
  const handleUpdateNodeCoordinatesAction = async (nodeId: string, x: number, y: number) => {
    try {
      await fetch(`/api/topology/node/${nodeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x, y })
      });
    } catch (e) {
      console.error("Coord storage bypass", e);
    }
  };

  // 7. Acknowledge Alerts
  const handleAcknowledgeAlertAction = async (id: string) => {
    try {
      const resp = await fetch("/api/alerts/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (resp.ok) {
        await fetchAllTelemetry();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 8. Clear alerts list
  const handleClearAlertsAction = async () => {
    try {
      const resp = await fetch("/api/alerts/clear", { method: "POST" });
      if (resp.ok) {
        await fetchAllTelemetry();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 9. Add firewall rules
  const handleAddFirewallRuleAction = async (rule: any) => {
    try {
      const resp = await fetch("/api/firewall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rule)
      });
      if (resp.ok) {
        await fetchAllTelemetry();
      } else {
        const err = await resp.json();
        alert(`Firewall configure error: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 10. Toggle Firewall State
  const handleToggleFirewallRuleAction = async (id: string, enabled: boolean) => {
    try {
      const resp = await fetch(`/api/firewall/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled })
      });
      if (resp.ok) {
        await fetchAllTelemetry();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 11. Update Threshold Config boundaries
  const handleUpdateThresholdsAction = async (newThresholds: ThresholdConfig) => {
    try {
      const resp = await fetch("/api/thresholds", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newThresholds)
      });
      if (resp.ok) {
        const updated = await resp.json();
        setThresholds(updated);
        await fetchAllTelemetry();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Active alarms count
  const activeUnackAlerts = alerts.filter(a => !a.acknowledged);

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-300 font-sans flex flex-col md:flex-row antialiased selection:bg-indigo-500/30">
      {/* Sidebar Navigation Panel */}
      <aside className="w-full md:w-64 bg-[#0F1219] border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
        <div>
          {/* NOC BRAND TAG - Sleek AXONNOC Branding */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-650/20">
                <div className="h-4 w-4 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                AXON<span className="text-indigo-500">NOC</span>
              </span>
            </div>
            {globalLoading && (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-400" />
            )}
          </div>

          {/* Nav List with Sleek styling */}
          <nav className="p-4 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase px-3 block mb-2 tracking-wider">MAPPED MODULES</span>
            
            {/* Nav 1 */}
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                activeTab === "dashboard" 
                  ? "bg-indigo-600/10 text-indigo-400" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <LayoutDashboard className="h-4 w-4 shrink-0 opacity-70" />
              Dashboard
            </button>

            {/* Nav 2 */}
            <button
              onClick={() => setActiveTab("devices")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                activeTab === "devices" 
                  ? "bg-indigo-600/10 text-indigo-400" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <Server className="h-4 w-4 shrink-0 opacity-70" />
              Devices
            </button>

            {/* Nav 3 */}
            <button
              onClick={() => setActiveTab("topology")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                activeTab === "topology" 
                  ? "bg-indigo-600/10 text-indigo-400" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <Network className="h-4 w-4 shrink-0 opacity-70" />
              Topology
            </button>

            {/* Nav 4 */}
            <button
              onClick={() => setActiveTab("alerts")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                activeTab === "alerts" 
                  ? "bg-indigo-600/10 text-indigo-400" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <BellRing className="h-4 w-4 shrink-0 opacity-70" />
                <span>Alerts</span>
              </div>
              {activeUnackAlerts.length > 0 && (
                <span className="ml-auto rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-500 font-bold">
                  {activeUnackAlerts.length}
                </span>
              )}
            </button>

            {/* Nav 5 */}
            <button
              onClick={() => setActiveTab("security")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                activeTab === "security" 
                  ? "bg-indigo-600/10 text-indigo-400" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <ShieldCheck className="h-4 w-4 shrink-0 opacity-70" />
              Security
            </button>

            {/* Nav 6 */}
            <button
              onClick={() => setActiveTab("logs")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                activeTab === "logs" 
                  ? "bg-indigo-600/10 text-indigo-400" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <FileLock className="h-4 w-4 shrink-0 opacity-70" />
              Analytics
            </button>

            {/* Nav 7 */}
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                activeTab === "settings" 
                  ? "bg-indigo-600/10 text-indigo-400" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <Settings className="h-4 w-4 shrink-0 opacity-70" />
              Settings
            </button>
          </nav>
        </div>

        {/* User Session card conforms to Sleek panel design */}
        <div className="p-4 border-t border-slate-800 space-y-3 bg-[#0F1219]">
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <div className="bg-slate-800/80 p-2 rounded max-w-[34px] flex items-center justify-center select-none font-bold uppercase border border-slate-750 text-indigo-400">
              EA
            </div>
            <div className="overflow-hidden">
              <span className="font-semibold block truncate select-none text-slate-200">evansabura1@gmail.com</span>
              <span className="text-[10px] text-indigo-400 font-mono font-semibold uppercase">ROLE: {currentUser.role}</span>
            </div>
          </div>
          <div className="rounded bg-slate-800/50 p-3 border border-slate-700/50">
            <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Gateway Load</p>
            <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 w-[72%]"></div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Center Platform */}
      <main className="flex-1 flex flex-col min-w-0 max-h-screen overflow-hidden">
        
        {/* Sleek Top Header Bar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-800 px-8 bg-[#0B0E14] shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-white tracking-tight">Global Infrastructure</h2>
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-500 ring-1 ring-inset ring-emerald-500/20">
              System Normal
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-500">TIME:</span>
              <span className="text-slate-200 uppercase">{new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC</span>
            </div>
            <button 
              onClick={() => setActiveTab("alerts")}
              className="relative flex h-8 w-8 items-center justify-center rounded-full border border-slate-800 text-slate-400 hover:bg-slate-800 transition-colors bg-[#0F1219]"
            >
              🔔
              {activeUnackAlerts.length > 0 && (
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
            </button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] text-white font-bold select-none shadow">
              EA
            </div>
          </div>
        </header>

        {/* Upper Floating notification bars if alerts flag breaches */}
        {activeUnackAlerts.length > 0 && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2.5 flex justify-between items-center text-xs font-bold shadow-md select-none shrink-0">
            <div className="flex items-center gap-2 animate-pulse truncate">
              <AlertTriangle className="h-4.5 w-4.5 text-slate-900 shrink-0" />
              <span>ACTIVE LAN/WAN CONGESTION: {activeUnackAlerts[0].source} BREACHED THRESHOLDS ALERT PARAMETERS {"-->"} "{activeUnackAlerts[0].message}"</span>
            </div>
            <button 
              onClick={() => setActiveTab("alerts")}
              className="px-2.5 py-1 bg-slate-950 hover:bg-slate-900 text-amber-400 font-extrabold rounded text-[10px] uppercase whitespace-nowrap cursor-pointer transition-all"
            >
              Analyze Alarms
            </button>
          </div>
        )}

        {/* Dynamic Nav views and tabs router wrappers */}
        <div className="flex-1 p-4 md:p-8 space-y-6 overflow-y-auto">
          
          {activeTab === "dashboard" && (
            <NetworkDashboard 
              devices={devices}
              alerts={alerts}
              role={currentUser.role}
              onNavigate={setActiveTab}
              onRefreshAll={fetchAllTelemetry}
            />
          )}

          {activeTab === "devices" && (
            <DevicesManager 
              devices={devices}
              role={currentUser.role}
              onAddDevice={handleAddDeviceAction}
              onDeleteDevice={handleDeleteDeviceAction}
              onRebootDevice={handleRebootDeviceAction}
              onTriggerScan={handleTriggerSubnetScanAction}
              onRefreshAll={fetchAllTelemetry}
            />
          )}

          {activeTab === "topology" && (
            <TopologyMap 
              nodes={topologyData.nodes}
              links={topologyData.links}
              devices={devices}
              onUpdateNodeCoordinates={handleUpdateNodeCoordinatesAction}
              onRefreshAll={fetchAllTelemetry}
            />
          )}

          {activeTab === "alerts" && thresholds && (
            <AlertsManager 
              alerts={alerts}
              thresholds={thresholds}
              role={currentUser.role}
              onAcknowledgeAlert={handleAcknowledgeAlertAction}
              onClearAlerts={handleClearAlertsAction}
              onUpdateThresholds={handleUpdateThresholdsAction}
            />
          )}

          {activeTab === "security" && (
            <SecurityConsole 
              firewallRules={firewallRules}
              role={currentUser.role}
              logs={logs}
              onSetRole={handleSetRoleAction}
              onAddFirewallRule={handleAddFirewallRuleAction}
              onToggleFirewallRule={handleToggleFirewallRuleAction}
            />
          )}

          {activeTab === "logs" && (
            <LogsExplorer 
              logs={logs}
              onRefreshAll={fetchAllTelemetry}
            />
          )}

          {/* Settings Control center tab */}
          {activeTab === "settings" && thresholds && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <Settings className="h-5 w-5 text-indigo-400" />
                  NOC System Preferences
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Initialize default templates, audit databases seeds, and configure user session role properties.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Auth section */}
                <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800/80 space-y-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-1.5 border-b border-slate-805 pb-2">
                    <User className="h-4 w-4 text-indigo-400" />
                    Authentication Analyst Info
                  </h3>
                  
                  <div className="space-y-3.5 text-xs bg-slate-950/40 p-4 rounded-lg border border-slate-900 leading-relaxed">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Sign-In Account:</span>
                      <span className="font-semibold text-slate-200">evansabura1@gmail.com</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-normal">Privilege authorization:</span>
                      <span className="px-2 py-0.5 font-mono text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-900/30 rounded uppercase">
                        {currentUser.role}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Token ID payload:</span>
                      <span className="text-slate-400 font-mono text-[10px]">jwt_token_sha256_mock_nexus...</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider mb-1.5">Switch active user profiles</span>
                    <div className="grid grid-cols-3 gap-2">
                      {["Admin", "Network Engineer", "Viewer"].map(r => (
                        <button
                          key={r}
                          onClick={() => handleSetRoleAction(r as UserRole)}
                          className={`py-1.5 rounded text-[10px] font-bold tracking-wide uppercase cursor-pointer border transition-all ${
                            currentUser.role === r 
                              ? "bg-indigo-600 text-white border-indigo-500" 
                              : "bg-slate-950/60 text-slate-400 border-slate-805 hover:text-slate-200"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5 leading-normal">
                      Use the role selectors to easily test UI rendering changes: "Viewer" will lock edit/delete actions for safety.
                    </p>
                  </div>
                </div>

                {/* Databases section */}
                <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800/80 space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-1.5 border-b border-slate-805 pb-2">
                      <Database className="h-4 w-4 text-indigo-400" />
                      In-Memory DB Seed Utilities
                    </h3>

                    <div className="bg-slate-950/40 p-3.5 border border-slate-900 rounded-lg text-xs leading-normal text-slate-400 space-y-2">
                      <p>All diagnostic parameters, registered sub-elements, firewalls protocols, and dragging layout maps coordinates persist in active container RAM memory.</p>
                      <p>If you wish to force reload mock datasets (repairing link status, reverting unmonitored devices), triggers are registered below.</p>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      if (confirm("Re-seed core databases? This will clear newly defined routers or scan records.")) {
                         window.location.reload();
                      }
                    }}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded border border-slate-705 font-semibold text-xs transition-all cursor-pointer"
                  >
                    Reseed Default Telemetry Data
                  </button>
                </div>

              </div>
              
              {/* Detailed developer system definitions conforming to rule 1 */}
              <div className="bg-slate-900/20 p-5 rounded-xl border border-dashed border-slate-800 text-xs text-slate-500 leading-normal space-y-1 select-none font-mono">
                <p>NOC CONSOLE PROPERTIES CONFIGURATION PROTOCOL (RFC-5424)</p>
                <p>HOST PLATFORM: CLOUD RUN • REVERSE PROXY HOST: PORT 3000 (INBOUND EXCLUSIVE)</p>
                <p>GEMINI DEPLOYMENT ENGINE: GOOGLE @GOOGLE/GENAI (VERSION ^2.4.0) • MODEL: gemini-3.5-flash</p>
              </div>
            </div>
          )}
          
        </div>

        {/* Bottom Status Bar from Sleek Interface design */}
        <footer className="h-10 bg-indigo-600 flex items-center px-6 justify-between text-white text-[10px] font-bold select-none shrink-0 font-mono">
           <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></div>
                <span>ENGINE: v4.12.0-STABLE</span>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <span>SCANNING: ICMP, SNMP, ARP, TCP_STEALTH</span>
              </div>
           </div>
           <div className="uppercase tracking-widest hidden md:block">
             Secured with Quantum-Edge Protocol 2.0
           </div>
        </footer>
      </main>
    </div>
  );
}
