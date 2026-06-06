import React, { useState } from "react";
import { NetworkDevice, DeviceType, UserRole } from "../types";
import { 
  Server, 
  Search, 
  Plus, 
  Trash2, 
  Edit, 
  Eye, 
  Terminal, 
  RefreshCcw, 
  Cpu, 
  Clock, 
  Sparkles, 
  Play, 
  Settings, 
  ShieldAlert,
  Wifi,
  Workflow
} from "lucide-react";

interface DevicesProps {
  devices: NetworkDevice[];
  role: UserRole;
  onAddDevice: (device: any) => Promise<void>;
  onDeleteDevice: (id: string) => Promise<void>;
  onRebootDevice: (id: string) => Promise<void>;
  onTriggerScan: (subnet: string) => Promise<number>;
  onRefreshAll: () => void;
}

export default function DevicesManager({
  devices,
  role,
  onAddDevice,
  onDeleteDevice,
  onRebootDevice,
  onTriggerScan,
  onRefreshAll
}: DevicesProps) {
  // Search state variables
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Selection/Detail View
  const [selectedDevice, setSelectedDevice] = useState<NetworkDevice | null>(null);

  // Discovery Subnet Scanner active State
  const [subnetInput, setSubnetInput] = useState("10.0.2.0/24");
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [discoveredCount, setDiscoveredCount] = useState<number | null>(null);

  // CLI Ping Utility modal variables
  const [pingingDevice, setPingingDevice] = useState<NetworkDevice | null>(null);
  const [pingOutput, setPingOutput] = useState("");
  const [loadingPing, setLoadingPing] = useState(false);

  // Add Device modal controller
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDevName, setNewDevName] = useState("");
  const [newDevIp, setNewDevIp] = useState("10.0.");
  const [newDevType, setNewDevType] = useState<DeviceType>("server");
  const [newDevDept, setNewDevDept] = useState("Corporate IT");
  const [newDevSnmp, setNewDevSnmp] = useState(true);
  const [newDevSnmpVer, setNewDevSnmpVer] = useState<"v2c" | "v3">("v3");

  const isReadOnly = role === "Viewer";

  // Filter lists
  const filteredDevices = devices.filter(dev => {
    const matchesSearch = dev.name.toLowerCase().includes(search.toLowerCase()) || dev.ip.includes(search) || dev.department.toLowerCase().includes(search.toLowerCase());
    const matchesType = selectedType === "all" || dev.type === selectedType;
    const matchesStatus = selectedStatus === "all" || dev.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Handle active ping trace request
  const handleTriggerPing = async (dev: NetworkDevice) => {
    setPingingDevice(dev);
    setLoadingPing(true);
    setPingOutput(`Console shell initializing: pinging target ${dev.ip} with standard TTL packets...`);
    try {
      const response = await fetch(`/api/devices/ping/${dev.id}`, { method: "POST" });
      const data = await response.json();
      if (data.output) {
        setPingOutput(data.output);
      } else {
        setPingOutput(`ICMP Error: Failed transmitting ping packets. Host likely unreachable or network isolation block.`);
      }
    } catch (err) {
      setPingOutput(`CLI execution crash. Network adapter interface timeout.`);
    } finally {
      setLoadingPing(false);
    }
  };

  // Handle auto-discovery sweeper scan
  const handleRunSubnetScan = async () => {
    setScanning(true);
    setScanProgress(10);
    setDiscoveredCount(null);

    // Simulated progress bar animations
    const interval = setInterval(() => {
      setScanProgress(p => {
        if (p >= 95) {
          clearInterval(interval);
          return 95;
        }
        return p + Math.floor(Math.random() * 15 + 5);
      });
    }, 400);

    try {
      const discoveredNew = await onTriggerScan(subnetInput);
      clearInterval(interval);
      setScanProgress(100);
      setDiscoveredCount(discoveredNew);
      setTimeout(() => {
        setScanning(false);
        setScanProgress(0);
      }, 3000);
    } catch (err) {
      clearInterval(interval);
      setScanning(false);
    }
  };

  // Add Device Trigger Submission
  const handleCreateDeviceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDevName || !newDevIp) {
      alert("Please fill required fields.");
      return;
    }

    await onAddDevice({
      name: newDevName,
      ip: newDevIp,
      type: newDevType,
      department: newDevDept,
      snmpEnabled: newDevSnmp,
      snmpVersion: newDevSnmpVer
    });

    // Reset fields
    setNewDevName("");
    setNewDevIp("10.0.");
    setShowAddForm(false);
  };

  // Helper type colors
  const getTypeColor = (type: DeviceType) => {
    switch (type) {
      case "firewall": return "bg-red-950/40 text-red-400 border-red-900/40";
      case "router": return "bg-purple-950/40 text-purple-400 border-purple-900/40";
      case "switch": return "bg-indigo-950/40 text-indigo-400 border-indigo-900/40";
      case "server": return "bg-blue-950/40 text-blue-400 border-blue-900/40";
      case "iot": return "bg-amber-950/40 text-amber-500 border-amber-900/40";
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header and Action Buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0F1219] p-4 rounded-xl border border-slate-800 shadow-sm shadow-black/20">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search box */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search IP, host, dept..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-slate-950 text-slate-100 text-xs pl-9 pr-4 py-2 w-full rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Type dropdown filter */}
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="bg-slate-950 text-slate-300 text-xs px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">ALL TYPES</option>
            <option value="router">ROUTERS</option>
            <option value="switch">SWITCHES</option>
            <option value="firewall">FIREWALLS</option>
            <option value="server">SERVERS</option>
            <option value="iot">IOT & PERIPHERALS</option>
          </select>

          {/* Status dropdown filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="bg-slate-950 text-slate-300 text-xs px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">ALL HEALTH STATUSES</option>
            <option value="healthy">HEALTHY (GREEN)</option>
            <option value="warning">WARNING (YELLOW)</option>
            <option value="critical">CRITICAL (RED)</option>
          </select>
        </div>

        <button
          onClick={() => {
            if (isReadOnly) {
              alert("Acess Denied: Read-Only Viewers are prevented from registering assets.");
            } else {
              setShowAddForm(true);
            }
          }}
          className={`flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer transition-all border border-indigo-500/30 ${
            isReadOnly ? "opacity-55 cursor-not-allowed" : ""
          }`}
        >
          <Plus className="h-4 w-4" />
          Register Network Appliance
        </button>
      </div>

      {/* Discovery Tool card & IP range scan */}
      <div className="bg-[#0F1219] p-5 rounded-xl border border-slate-800 shadow-sm shadow-black/20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex gap-3">
            <Workflow className="h-9 w-9 text-indigo-400 shrink-0 bg-indigo-950/60 p-1.5 rounded-lg border border-indigo-900/40" />
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                Dynamic Subnet Discovery & ARP Sweeper
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Performs active simulated ARP/SNMP scanning over a subnet scope to list and classification-tag unmonitored connected hardware nodes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 px-3 py-1.5 text-xs">
              <span className="text-slate-500 mr-2 font-mono">SCOPE:</span>
              <input 
                type="text" 
                value={subnetInput}
                onChange={e => setSubnetInput(e.target.value)}
                disabled={scanning}
                className="bg-transparent text-slate-200 outline-none w-28 font-mono focus:text-indigo-400 text-xs"
              />
            </div>
            <button
              onClick={handleRunSubnetScan}
              disabled={scanning || isReadOnly}
              className={`bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-400 hover:text-indigo-300 text-xs font-semibold px-4 py-2 rounded-lg border border-indigo-500/25 cursor-pointer transition-all ${
                isReadOnly ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              Scan Subnet
            </button>
          </div>
        </div>

        {/* Discovery Scan Loading Meter */}
        {scanning && (
          <div className="mt-4 space-y-2 bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 animate-fadeIn">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span className="font-mono flex items-center gap-2">
                <RefreshCcw className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                sweeping range: {subnetInput}... Discovering ports & MAC headers...
              </span>
              <span className="font-semibold text-slate-200">{scanProgress}%</span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-300" 
                style={{ width: `${scanProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {discoveredCount !== null && (
          <div className="mt-4 bg-emerald-950/20 px-4 py-3 rounded-lg border border-emerald-900/40 text-emerald-300 text-xs animate-fadeIn">
            <span className="font-semibold">Discovery results:</span> Subnetwork audit completed. Discovered and classified <span className="font-bold underline">{discoveredCount}</span> rogue connection channels (Badge scanners & Nurseries Cameras) and mapped them cleanly onto floor VLAN segments.
          </div>
        )}
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Tabular list of active devices */}
        <div className="bg-[#0F1219] rounded-xl border border-slate-800 overflow-hidden xl:col-span-2 shadow-sm shadow-black/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800/80 font-semibold">
                  <th className="p-4">Appliance Name</th>
                  <th className="p-4">IP Address</th>
                  <th className="p-4">Class Type</th>
                  <th className="p-4">Department / VLAN</th>
                  <th className="p-4">Health Details</th>
                  <th className="p-4 text-right">Operational Tools</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredDevices.map(dev => (
                  <tr 
                    key={dev.id} 
                    onClick={() => setSelectedDevice(dev)}
                    className={`hover:bg-slate-900/30 cursor-pointer transition-colors ${
                      selectedDevice?.id === dev.id ? "bg-slate-900/50 border-l-2 border-indigo-500" : ""
                    }`}
                  >
                    <td className="p-4">
                      <div className="font-semibold text-white flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                          dev.status === "healthy" ? "bg-emerald-500" : (dev.status === "warning" ? "bg-amber-400" : "bg-rose-500")
                        }`}></span>
                        {dev.name}
                      </div>
                    </td>
                    <td className="p-4 font-mono text-slate-300">{dev.ip}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-mono capitalize ${getTypeColor(dev.type)}`}>
                        {dev.type}
                      </span>
                    </td>
                    <td className="p-4 truncate max-w-[130px] text-slate-400">
                      {dev.department}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-300">
                        <span>CPU: {dev.cpuUsage}%</span>
                        <span className="text-slate-500">|</span>
                        <span>{dev.pingLatency}ms</span>
                      </div>
                    </td>
                    <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleTriggerPing(dev)}
                          title="Execute CLI ping checks"
                          className="p-1 px-2 bg-slate-950 hover:bg-slate-800 rounded border border-slate-800 hover:border-slate-700 text-emerald-400 cursor-pointer transition-all"
                        >
                          <Terminal className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (isReadOnly) {
                              alert("Viewer role is restricted from rebooting devices.");
                            } else {
                              onRebootDevice(dev.id);
                            }
                          }}
                          disabled={isReadOnly}
                          title="Trigger full reboot"
                          className={`p-1 px-2 bg-slate-950 hover:bg-slate-800 rounded border border-slate-800 hover:border-slate-700 text-amber-400 cursor-pointer transition-all ${
                            isReadOnly ? "opacity-45" : ""
                          }`}
                        >
                          <RefreshCcw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (isReadOnly) {
                              alert("Viewer role cannot delete assets.");
                            } else {
                              if (confirm(`Unlink and remove device ${dev.name}?`)) onDeleteDevice(dev.id);
                            }
                          }}
                          disabled={isReadOnly}
                          title="Unlink device"
                          className={`p-1 px-2 bg-slate-950 hover:bg-slate-850 rounded border border-slate-800 hover:border-slate-700 text-rose-400 cursor-pointer transition-all ${
                            isReadOnly ? "opacity-45" : ""
                          }`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredDevices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                      No connected devices match search queries or filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Detailed Node Monitoring & SNMP inspector */}
        <div className="bg-[#0F1219] p-5 rounded-xl border border-slate-800 space-y-4 shadow-sm shadow-black/20">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2.5">
            <Server className="h-4.5 w-4.5 text-indigo-400" />
            SNMP Telemetry Inspector
          </h3>

          {selectedDevice ? (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-base font-bold text-white leading-tight">{selectedDevice.name}</h4>
                  <span className="text-xs font-mono text-slate-400">{selectedDevice.ip}</span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 ${
                  selectedDevice.status === 'healthy' ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/40' :
                  (selectedDevice.status === 'warning' ? 'bg-amber-950/20 text-amber-400 border border-amber-900/40' : 'bg-rose-950/20 text-rose-400 border border-rose-900/40')
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    selectedDevice.status === 'healthy' ? 'bg-emerald-400' : (selectedDevice.status === 'warning' ? 'bg-amber-400' : 'bg-rose-400')
                  }`}></span>
                  {selectedDevice.status}
                </span>
              </div>

              {/* Hardware resources dials */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/40 p-3.5 rounded-lg border border-slate-850">
                <div className="space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">Uptime</span>
                  <p className="text-slate-200 font-medium font-mono truncate">{selectedDevice.uptime}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">SNMP Target</span>
                  <p className="text-slate-200 font-medium font-mono capitalize">
                    {selectedDevice.snmpEnabled ? `Enabled (${selectedDevice.snmpVersion})` : "Unconfigured"}
                  </p>
                </div>
                <div className="space-y-1 pt-2 border-t border-slate-850/50">
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">Ingress Rate</span>
                  <p className="text-slate-200 font-medium font-mono text-indigo-400">{selectedDevice.bandwidthIn} Mbps</p>
                </div>
                <div className="space-y-1 pt-2 border-t border-slate-850/50">
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">Egress Rate</span>
                  <p className="text-slate-200 font-medium font-mono text-emerald-400">{selectedDevice.bandwidthOut} Mbps</p>
                </div>
              </div>

              {/* Performance meters */}
              <div className="space-y-3">
                {/* Meter 1 */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Processor Capacity (CPU)</span>
                    <span className="font-mono text-slate-200 font-semibold">{selectedDevice.cpuUsage}%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        selectedDevice.cpuUsage > 80 ? 'bg-rose-500' : (selectedDevice.cpuUsage > 60 ? 'bg-amber-400' : 'bg-indigo-500')
                      }`}
                      style={{ width: `${selectedDevice.cpuUsage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Meter 2 */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Memory Swap Allocation (RAM)</span>
                    <span className="font-mono text-slate-200 font-semibold">{selectedDevice.ramUsage}%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        selectedDevice.ramUsage > 80 ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${selectedDevice.ramUsage}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Sub interfaces status */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Port Interfaces Mappings</span>
                <div className="space-y-2">
                  {selectedDevice.ports.map((port, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-950/20 px-3 py-2 rounded border border-slate-900 text-xs">
                      <span className="font-mono text-slate-400 flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${port.status === 'up' ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
                        Eth0/Gi{port.number}
                      </span>
                      <span className="text-slate-300 font-medium truncate max-w-[140px]">{port.service}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold font-mono uppercase ${
                        port.status === 'up' ? 'bg-emerald-950/40 text-emerald-400' : 'bg-slate-900 text-slate-400'
                      }`}>
                        {port.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-850 rounded-lg flex flex-col items-center justify-center gap-3">
              <Eye className="h-8 w-8 text-slate-700 animate-pulse" />
              <span>Select any appliance in the directory layout to parse real-time snmp metrics, interfaces and resources load.</span>
            </div>
          )}
        </div>
      </div>

      {/* CLI Ping Terminal Panel */}
      {pingingDevice && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-950 rounded-xl border border-slate-800 w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="bg-slate-900 px-5 py-4 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200 font-mono">ICMP Probe Client — admin@noc-gateway</span>
              </div>
              <button 
                onClick={() => setPingingDevice(null)}
                className="text-slate-400 hover:text-white font-semibold text-xs cursor-pointer"
              >
                Close Output [Esc]
              </button>
            </div>
            
            <div className="p-4 bg-black/90 h-80 overflow-y-auto font-mono text-[11px] leading-relaxed text-emerald-400 flex flex-col justify-between">
              <pre className="whitespace-pre-wrap">{pingOutput}</pre>
              {loadingPing && (
                <div className="flex gap-2 items-center text-indigo-400 font-mono text-[10px] mt-2 border-t border-slate-900 pt-2 shrink-0 animate-pulse">
                  <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                  <span>TRANSMITTING PACKETS...</span>
                </div>
              )}
            </div>

            <div className="bg-slate-900 px-4 py-3 flex justify-between items-center text-[10px] text-slate-500 font-mono border-t border-slate-800 select-none">
              <span>TARGET BIND: {pingingDevice.name} [{pingingDevice.ip}]</span>
              <span>TTL: 64 • PAYLOAD: 56b</span>
            </div>
          </div>
        </div>
      )}

      {/* Add Device Dialog Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form 
            onSubmit={handleCreateDeviceSubmit}
            className="bg-slate-900 rounded-xl border border-slate-800 w-full max-w-lg overflow-hidden shadow-2xl space-y-4"
          >
            <div className="bg-slate-950 px-5 py-4 border-b border-slate-800/80 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-white">Register Novel Network Element</h3>
              <button 
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Device Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Core-SW-ZoneB"
                    value={newDevName}
                    onChange={e => setNewDevName(e.target.value)}
                    className="bg-slate-950 text-slate-200 p-2.5 w-full rounded border border-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">IP Address Binding *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10.0.1.5"
                    value={newDevIp}
                    onChange={e => setNewDevIp(e.target.value)}
                    className="bg-slate-950 text-slate-200 p-2.5 w-full rounded border border-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Appliance Classification *</label>
                  <select
                    value={newDevType}
                    onChange={e => setNewDevType(e.target.value as DeviceType)}
                    className="bg-slate-950 text-slate-300 p-2.5 w-full rounded border border-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="router">Router</option>
                    <option value="switch">Switch</option>
                    <option value="firewall">Firewall</option>
                    <option value="server">Server</option>
                    <option value="iot">Facilities / IoT Key</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Segment Department Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. Security Operations"
                    value={newDevDept}
                    onChange={e => setNewDevDept(e.target.value)}
                    className="bg-slate-950 text-slate-200 p-2.5 w-full rounded border border-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-lg border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Configure SNMP agent monitoring</label>
                  <input
                    type="checkbox"
                    checked={newDevSnmp}
                    onChange={e => setNewDevSnmp(e.target.checked)}
                    className="h-4 w-4 bg-slate-950 border-slate-800 rounded checked:bg-indigo-500 accent-indigo-500 cursor-pointer"
                  />
                </div>
                
                {newDevSnmp && (
                  <div className="grid grid-cols-2 gap-4 pt-1 animate-fadeIn">
                    <div className="space-y-1">
                      <span className="text-slate-500 text-[10px]">Security Engine Version</span>
                      <select
                        value={newDevSnmpVer}
                        onChange={e => setNewDevSnmpVer(e.target.value as "v2c" | "v3")}
                        className="bg-slate-900 text-slate-300 p-2 rounded border border-slate-800 text-[11px] cursor-pointer"
                      >
                        <option value="v2c">v2c (Community Strings)</option>
                        <option value="v3">v3 (AuthNoPriv Encryption)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-950 p-4 border-t border-slate-800 flex justify-end gap-3.5">
              <button 
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
              >
                Discard
              </button>
              <button 
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-2 rounded-lg border border-indigo-500/30 cursor-pointer"
              >
                Commit Register
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
