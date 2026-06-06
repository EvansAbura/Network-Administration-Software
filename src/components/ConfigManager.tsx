import React, { useState, useEffect } from "react";
import { DeviceConfig, NetworkDevice, UserRole } from "../types";
import { 
  Database, 
  RotateCw, 
  Plus, 
  FileCode, 
  Settings, 
  Flame, 
  History, 
  CheckCircle,
  FileText,
  Terminal,
  Send,
  Eye,
  ArrowRight,
  GitCompare,
  AlertCircle
} from "lucide-react";

interface ConfigManagerProps {
  devices: NetworkDevice[];
  role: UserRole;
  onRefreshAll?: () => void;
}

export default function ConfigManager({ devices, role, onRefreshAll }: ConfigManagerProps) {
  const [configs, setConfigs] = useState<DeviceConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [backupLoading, setBackupLoading] = useState<boolean>(false);
  const [deployLoading, setDeployLoading] = useState<boolean>(false);
  
  // Forms & Selections
  const [selectedDeviceInput, setSelectedDeviceInput] = useState<string>("");
  const [selectedProtocol, setSelectedProtocol] = useState<'SSH' | 'Telnet' | 'TFTP' | 'NETCONF'>("SSH");
  const [backupComment, setBackupComment] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // Diff comparison states
  const [diffDevice, setDiffDevice] = useState<string>("");
  const [diffLeftId, setDiffLeftId] = useState<string>("");
  const [diffRightId, setDiffRightId] = useState<string>("");
  const [diffViewActive, setDiffViewActive] = useState<boolean>(false);

  // Deploy templates states
  const [deployDevice, setDeployDevice] = useState<string>("");
  const [deployTemplate, setDeployTemplate] = useState<string>(`! Custom Configuration changes to deploy
interface GigabitEthernet0/1
 description Primary Core Uplink Bus
 ip address 10.0.0.1 255.255.255.0
 speed 1000
 duplex full
!
! Enforce administrative ACL limits
access-list 105 permit tcp any any eq 443
access-list 105 deny ip any 185.220.101.0 0.0.0.255
!`);
  const [deployComment, setDeployComment] = useState<string>("Deploying bandwidth optimization overrides");

  // Selected config view modal/drawer
  const [inspectedConfig, setInspectedConfig] = useState<DeviceConfig | null>(null);

  const fetchConfigsData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/configs");
      const data = await res.json();
      setConfigs(data);
      
      // Auto pre-select diff dropdowns if we have configurations
      if (data.length > 0) {
        const uniqueDevices = Array.from(new Set(data.map((c: DeviceConfig) => c.deviceId)));
        if (uniqueDevices.length > 0) {
          const devId = uniqueDevices[0];
          setDiffDevice(devId);
          const devConfigs = data.filter((c: DeviceConfig) => c.deviceId === devId);
          if (devConfigs.length >= 2) {
            setDiffLeftId(devConfigs[1].id);
            setDiffRightId(devConfigs[0].id);
          } else if (devConfigs.length > 0) {
            setDiffLeftId(devConfigs[0].id);
            setDiffRightId(devConfigs[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Failed fetching config details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigsData();
    if (devices.length > 0) {
      setSelectedDeviceInput(devices[0].id);
      setDeployDevice(devices[0].id);
    }
  }, [devices]);

  const handleDeviceChangeForDiff = (deviceId: string) => {
    setDiffDevice(deviceId);
    const filteredConfigs = configs.filter(c => c.deviceId === deviceId);
    if (filteredConfigs.length >= 2) {
      setDiffLeftId(filteredConfigs[1].id);
      setDiffRightId(filteredConfigs[0].id);
    } else if (filteredConfigs.length > 0) {
      setDiffLeftId(filteredConfigs[0].id);
      setDiffRightId(filteredConfigs[0].id);
    } else {
      setDiffLeftId("");
      setDiffRightId("");
    }
    setDiffViewActive(false);
  };

  const handleTriggerBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'Viewer') {
      setErrorMsg("Unauthorized: Viewers only have read-only access. Switch roles in Settings.");
      return;
    }
    if (!selectedDeviceInput) return;

    try {
      setBackupLoading(true);
      setErrorMsg("");
      setSuccessMsg("");

      const res = await fetch("/api/configs/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: selectedDeviceInput,
          protocol: selectedProtocol,
          comment: backupComment
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Backup request failed");
      }

      const newBackup = await res.json();
      setSuccessMsg(`Success! Saved Configuration Snapshot Version ${newBackup.version} via ${selectedProtocol}.`);
      setBackupComment("");
      fetchConfigsData();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      setErrorMsg(err.message || "Unable to retrieve backup.");
    } finally {
      setBackupLoading(false);
    }
  };

  const handleTriggerDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'Viewer') {
      setErrorMsg("Unauthorized: Viewers only have read-only access. Switch roles in Settings.");
      return;
    }
    if (!deployDevice || !deployTemplate) {
      setErrorMsg("Please select a device and enter config payload templates.");
      return;
    }

    try {
      setDeployLoading(true);
      setErrorMsg("");
      setSuccessMsg("");

      const res = await fetch("/api/configs/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: deployDevice,
          content: deployTemplate,
          comment: deployComment
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Deploy request failed");
      }

      await res.json();
      setSuccessMsg("Configuration deployed successfully to device memory! New version archived.");
      fetchConfigsData();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed deployment payload validation.");
    } finally {
      setDeployLoading(false);
    }
  };

  // Basic line-by-line diff implementation
  const computeDiffLines = () => {
    const leftCfg = configs.find(c => c.id === diffLeftId);
    const rightCfg = configs.find(c => c.id === diffRightId);

    if (!leftCfg || !rightCfg) return [];

    const leftLines = leftCfg.content.split("\n");
    const rightLines = rightCfg.content.split("\n");

    const diffOutput: { type: 'added' | 'removed' | 'common'; text: string; leftLine?: number; rightLine?: number }[] = [];

    // Simple LCS-like rendering comparison logic
    let leftIdx = 0;
    let rightIdx = 0;

    while (leftIdx < leftLines.length || rightIdx < rightLines.length) {
      if (leftIdx >= leftLines.length) {
        diffOutput.push({ type: 'added', text: rightLines[rightIdx], rightLine: rightIdx + 1 });
        rightIdx++;
      } else if (rightIdx >= rightLines.length) {
        diffOutput.push({ type: 'removed', text: leftLines[leftIdx], leftLine: leftIdx + 1 });
        leftIdx++;
      } else {
        const leftText = leftLines[leftIdx];
        const rightText = rightLines[rightIdx];

        if (leftText === rightText) {
          diffOutput.push({ type: 'common', text: leftText, leftLine: leftIdx + 1, rightLine: rightIdx + 1 });
          leftIdx++;
          rightIdx++;
        } else {
          // If they differ, scan ahead slightly to detect shifts (crudely but effectively for standard IOS configs)
          if (leftLines[leftIdx + 1] === rightText) {
            diffOutput.push({ type: 'removed', text: leftText, leftLine: leftIdx + 1 });
            leftIdx++;
          } else if (leftText === rightLines[rightIdx + 1]) {
            diffOutput.push({ type: 'added', text: rightText, rightLine: rightIdx + 1 });
            rightIdx++;
          } else {
            diffOutput.push({ type: 'removed', text: leftText, leftLine: leftIdx + 1 });
            diffOutput.push({ type: 'added', text: rightText, rightLine: rightIdx + 1 });
            leftIdx++;
            rightIdx++;
          }
        }
      }
    }

    return diffOutput;
  };

  const diffLines = diffViewActive ? computeDiffLines() : [];

  return (
    <div className="space-y-6" id="config-manager-panel">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0F1219] p-4 rounded-xl border border-slate-800 shadow-sm shadow-black/20">
        <div className="flex items-center gap-3">
          <Database className="h-6 w-6 text-indigo-400" />
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Configuration Management Console</h1>
            <p className="text-xs text-slate-400 mt-0.5">Automate SSH/Telnet secure backups, compare version diff snapshots, and push templates to active devices.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button 
            type="button"
            onClick={fetchConfigsData}
            disabled={loading}
            className="flex items-center gap-2 text-xs bg-slate-800 hover:bg-slate-700 font-bold px-3 py-2 rounded-lg border border-slate-700 text-slate-200 transition-all cursor-pointer select-none"
          >
            <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sync Configurations
          </button>
          <div className="text-[10px] bg-indigo-600/10 px-2.5 py-1.5 rounded-lg border border-indigo-800/40 text-indigo-400 font-mono font-bold">
            USER PRIVILEGE: {role.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Notifications blocks */}
      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-start gap-3 animate-fadeIn text-rose-400" id="cfg-error bg">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 animate-bounce" />
          <div className="text-xs">
            <p className="font-bold">Execution Restalled</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-rose-300/90">{errorMsg}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3 animate-fadeIn text-emerald-400" id="cfg-success bg">
          <CheckCircle className="h-5 w-5 shrink-0 mt-0.5 animate-ping" />
          <div className="text-xs">
            <p className="font-bold">Transaction Complete</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-emerald-305/90">{successMsg}</p>
          </div>
        </div>
      )}

      {/* Dashboard Grid split into Discovery and Library */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left 2x column: Configuration SNAPSHOTS Library */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Snapshots Table */}
          <div className="bg-[#0F1219] rounded-xl border border-slate-800 overflow-hidden shadow-sm shadow-black/20">
            <div className="bg-slate-950 px-5 py-4 border-b border-slate-850 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <History className="h-4 w-4 text-indigo-400" />
                  Archived Configuration Versions ({configs.length})
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Historical snapshots of running system memory states securely cached in memory database.</p>
              </div>
              <span className="text-[10px] text-indigo-400 font-mono font-semibold px-2 py-0.5 bg-indigo-950/40 rounded border border-indigo-900/30">
                LATEST: v{configs.length > 0 ? Math.max(...configs.map(c => c.version)) : 0}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/50 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-850 tracking-wider">
                    <th className="px-5 py-3">Device Node</th>
                    <th className="px-5 py-3">Version</th>
                    <th className="px-5 py-3">Backup Method</th>
                    <th className="px-5 py-3">Captured By</th>
                    <th className="px-5 py-3">Comment / Description</th>
                    <th className="px-5 py-3 text-right">Timestamp</th>
                    <th className="px-5 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-500 font-medium">
                        <div className="flex items-center justify-center gap-2">
                          <RotateCw className="h-4 w-4 animate-spin text-indigo-400" />
                          <span>Searching configuration archives...</span>
                        </div>
                      </td>
                    </tr>
                  ) : configs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-500 font-medium">
                        No versioned configurations exist in database. Tap "Discover Device" below to pull a backup snapshot.
                      </td>
                    </tr>
                  ) : (
                    configs.map((cfg) => (
                      <tr 
                        key={cfg.id} 
                        className={`hover:bg-slate-950/30 transition-all ${cfg.active ? 'bg-indigo-600/5' : ''}`}
                      >
                        <td className="px-5 py-3">
                          <div className="font-semibold text-white">{cfg.deviceName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{cfg.deviceIp}</div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1 rounded font-bold px-2 py-0.5 font-mono text-[10px] ${
                            cfg.active
                              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-800'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            v{cfg.version} {cfg.active && "• ACTIVE"}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-semibold text-slate-400 font-mono">
                          {cfg.protocol}
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-[10px] tracking-wide rounded bg-slate-900 border border-slate-800 text-slate-300 font-bold uppercase px-1.5 py-0.5">
                            {cfg.backupBy}
                          </span>
                        </td>
                        <td className="px-5 py-3 max-w-[200px] truncate text-slate-400" title={cfg.comment}>
                          {cfg.comment || "N/A"}
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-slate-500 text-[10px]">
                          {cfg.timestamp.slice(0, 19).replace('T', ' ')}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button 
                            onClick={() => setInspectedConfig(cfg)}
                            className="bg-indigo-600/10 border border-indigo-500/25 text-indigo-400 hover:bg-indigo-600 hover:text-white px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-all select-none"
                            title="View Configuration Code"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Side-by-Side View Compare Diff */}
          <div className="bg-[#0F1219] p-5 rounded-xl border border-slate-800 shadow-sm shadow-black/20">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2 border-b border-slate-805 pb-3">
              <GitCompare className="h-4.5 w-4.5 text-indigo-400" />
              Compute Dynamic Difference (Diff Analyzer)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Target Device</label>
                <select
                  value={diffDevice}
                  onChange={(e) => handleDeviceChangeForDiff(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg px-3 py-2 text-white outline-none cursor-pointer focus:border-indigo-500"
                >
                  <option value="">-- Choose Managed Device --</option>
                  {Array.from(new Set(configs.map(c => c.deviceId))).map(devId => {
                    const devName = configs.find(c => c.deviceId === devId)?.deviceName;
                    return (
                      <option key={devId} value={devId}>{devName}</option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Baseline Version (Left)</label>
                <select
                  value={diffLeftId}
                  onChange={(e) => {
                    setDiffLeftId(e.target.value);
                    setDiffViewActive(false);
                  }}
                  disabled={!diffDevice}
                  className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg px-3 py-2 text-white outline-none cursor-pointer focus:border-indigo-500"
                >
                  <option value="">-- Baseline Version --</option>
                  {configs.filter(c => c.deviceId === diffDevice).map(c => (
                    <option key={c.id} value={c.id}>Version {c.version} ({c.protocol} - {c.timestamp.substring(0,10)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Target Version (Right)</label>
                <select
                  value={diffRightId}
                  onChange={(e) => {
                    setDiffRightId(e.target.value);
                    setDiffViewActive(false);
                  }}
                  disabled={!diffDevice}
                  className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg px-3 py-2 text-white outline-none cursor-pointer focus:border-indigo-500"
                >
                  <option value="">-- Compare Version --</option>
                  {configs.filter(c => c.deviceId === diffDevice).map(c => (
                    <option key={c.id} value={c.id}>Version {c.version} ({c.protocol} - {c.timestamp.substring(0,10)})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mb-4">
              <button
                type="button"
                disabled={!diffLeftId || !diffRightId}
                onClick={() => setDiffViewActive(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg border border-indigo-500 cursor-pointer select-none transition-all duration-150 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trigger Compare Analysis
              </button>
            </div>

            {diffViewActive && diffLines.length > 0 && (
              <div className="mt-4 bg-slate-950 rounded-lg border border-slate-850 overflow-hidden animate-fadeIn font-mono text-[11px] leading-relaxed">
                <div className="px-4 py-2 bg-slate-900 border-b border-slate-850 text-slate-400 flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                  <span>BASELINE V{configs.find(c => c.id === diffLeftId)?.version}</span>
                  <div className="flex gap-4">
                    <span className="text-rose-400 flex items-center gap-1">● DELETIONS</span>
                    <span className="text-emerald-400 flex items-center gap-1">● INSERTS</span>
                  </div>
                  <span>COMPARE V{configs.find(c => c.id === diffRightId)?.version}</span>
                </div>
                <div className="max-h-96 overflow-y-auto p-4 space-y-0.5 select-text selection:bg-indigo-500 selection:text-white">
                  {diffLines.map((line, index) => {
                    let textClass = "text-slate-300";
                    let prefix = "  ";
                    let bgClass = "hover:bg-slate-900/30";

                    if (line.type === 'added') {
                      textClass = "text-emerald-400 font-semibold";
                      prefix = "+ ";
                      bgClass = "bg-emerald-950/20 hover:bg-emerald-950/30";
                    } else if (line.type === 'removed') {
                      textClass = "text-rose-400 font-semibold";
                      prefix = "- ";
                      bgClass = "bg-rose-950/20 hover:bg-rose-950/30";
                    }

                    return (
                      <div key={index} className={`grid grid-cols-12 py-0.5 px-2 rounded ${bgClass} transition-colors`}>
                        <div className="col-span-1 text-slate-600 text-right select-none pr-3 border-r border-slate-850">
                          {line.leftLine || ""}
                        </div>
                        <div className="col-span-1 text-slate-600 text-right select-none pr-3 border-r border-slate-850">
                          {line.rightLine || ""}
                        </div>
                        <div className={`col-span-10 pl-4 whitespace-pre truncate ${textClass}`}>
                          {prefix}{line.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {diffViewActive && diffLines.length === 0 && (
              <p className="text-center py-6 text-slate-500 text-xs">Baseline and compare versions are absolutely identical.</p>
            )}
          </div>

        </div>

        {/* Right 1x column: Capture/Backup discovery and Config Deploy templates */}
        <div className="space-y-6">
          
          {/* On-Demand Discovery Backup Tool */}
          <div className="bg-[#0F1219] p-5 rounded-xl border border-slate-800 shadow-sm shadow-black/20">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-3 mb-4">
              <Terminal className="h-4.5 w-4.5 text-indigo-400 animate-pulse" />
              Pull Device Backup on Demand
            </h3>

            <form onSubmit={handleTriggerBackup} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Target Managed Device</label>
                <select
                  value={selectedDeviceInput}
                  onChange={(e) => setSelectedDeviceInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg px-3 py-2 text-white outline-none cursor-pointer focus:border-indigo-500"
                >
                  {devices.map(dev => (
                    <option key={dev.id} value={dev.id}>{dev.name} ({dev.ip})</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">System will discover current flash memory parameters of this instrument.</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Transport Protocol</label>
                <div className="grid grid-cols-4 gap-2">
                  {(["SSH", "Telnet", "TFTP", "NETCONF"] as const).map(proto => (
                    <button
                      type="button"
                      key={proto}
                      onClick={() => setSelectedProtocol(proto)}
                      className={`py-1.5 rounded font-bold uppercase text-[10px] tracking-wide cursor-pointer transition-all border ${
                        selectedProtocol === proto
                          ? "bg-indigo-600 text-white border-indigo-500"
                          : "bg-slate-950 text-slate-400 border-slate-850 hover:bg-slate-900"
                      }`}
                    >
                      {proto}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Backup Comment</label>
                <input
                  type="text"
                  placeholder="e.g. Scheduled pre-patch audit"
                  value={backupComment}
                  onChange={(e) => setBackupComment(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={backupLoading || devices.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-lg border border-indigo-500 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed select-none"
              >
                {backupLoading ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin" />
                    Connecting via {selectedProtocol}...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Pull & Discover Configuration
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Configuration Change Deployer */}
          <div className="bg-[#0F1219] p-5 rounded-xl border border-slate-800 shadow-sm shadow-black/20">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-3 mb-4">
              <Send className="h-4 w-4 text-indigo-400" />
              Push Configuration Changes
            </h3>

            <form onSubmit={handleTriggerDeploy} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Target Device</label>
                <select
                  value={deployDevice}
                  onChange={(e) => setDeployDevice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg px-3 py-2 text-white outline-none cursor-pointer focus:border-indigo-500"
                >
                  {devices.map(dev => (
                    <option key={dev.id} value={dev.id}>{dev.name} ({dev.ip})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Deployment Payload (Cisco IOS commands)</label>
                <textarea
                  rows={6}
                  value={deployTemplate}
                  onChange={(e) => setDeployTemplate(e.target.value)}
                  placeholder="! Put running commands here"
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg p-3 text-emerald-400 font-mono text-[11px] leading-relaxed outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shrink-0"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Deployment Comment / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Optimize WAN interface ingress rate"
                  value={deployComment}
                  onChange={(e) => setDeployComment(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={deployLoading || !deployTemplate}
                className="w-full bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-xs py-2.5 rounded-lg border border-indigo-900/40 flex items-center justify-center gap-2 transition-all cursor-pointer shadow disabled:opacity-50"
              >
                {deployLoading ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin" />
                    Pushing to startup flash...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Deploy Config Template
                  </>
                )}
              </button>
            </form>
          </div>

        </div>

      </div>

      {/* Inspect Raw Config Sheet Drawer Modal Overlay */}
      {inspectedConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn" id="config-inspect-modal">
          <div className="bg-[#0F1219] w-full max-w-2xl rounded-xl border border-slate-800 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-850 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileText className="h-4.5 w-4.5 text-indigo-400" />
                  Viewing Configuration Snapshot: {inspectedConfig.deviceName}
                </h4>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">IP address: {inspectedConfig.deviceIp} • Backed up by {inspectedConfig.backupBy}</p>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-900/10 px-2 py-0.5 rounded border border-emerald-800/30">
                Version {inspectedConfig.version}
              </span>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-950 border-b border-slate-850">
              <pre className="text-slate-300 font-mono text-xs leading-relaxed whitespace-pre-wrap select-text selection:bg-indigo-600 select-all">
                {inspectedConfig.content}
              </pre>
            </div>

            {inspectedConfig.comment && (
              <div className="px-6 py-3.5 bg-[#0A0D14] text-xs text-slate-400 border-b border-slate-850">
                <span className="font-bold text-slate-305">Snapshot Description:</span> {inspectedConfig.comment}
              </div>
            )}

            <div className="px-6 py-4 bg-slate-950 flex justify-between items-center">
              <div className="text-[10px] text-slate-500 font-mono">
                {inspectedConfig.timestamp.slice(0, 19).replace('T', ' ')}
              </div>
              <button 
                onClick={() => setInspectedConfig(null)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-all select-none"
              >
                Dismiss Viewer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
