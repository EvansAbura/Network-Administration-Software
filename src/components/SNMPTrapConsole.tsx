import React, { useState, useEffect } from "react";
import { SNMPTrap, TrapOidMapping, NetworkDevice, UserRole } from "../types";
import { 
  BellRing, 
  Radio, 
  Layers, 
  RotateCw, 
  Send, 
  Sliders, 
  AlertTriangle, 
  ShieldAlert, 
  BookOpen, 
  Wifi, 
  CheckCircle,
  FileCode,
  Globe,
  Settings
} from "lucide-react";

interface SNMPTrapConsoleProps {
  devices: NetworkDevice[];
  role: UserRole;
  onRefreshAll?: () => void;
}

export default function SNMPTrapConsole({ devices, role, onRefreshAll }: SNMPTrapConsoleProps) {
  const [traps, setTraps] = useState<SNMPTrap[]>([]);
  const [mappings, setMappings] = useState<TrapOidMapping[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [triggerLoading, setTriggerLoading] = useState<boolean>(false);

  // Form states to trigger mock traps
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [customIp, setCustomIp] = useState<string>("10.0.99.1");
  const [isCustomNode, setIsCustomNode] = useState<boolean>(false);
  
  const [selectedOid, setSelectedOid] = useState<string>("1.3.6.1.6.3.1.1.5.3"); // linkDown default
  const [customPayload, setCustomPayload] = useState<string>("Physical interface GigabitEthernet0/1 carrier signal lost.");
  const [selectedVersion, setSelectedVersion] = useState<'v1' | 'v2c' | 'v3'>("v2c");

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const trapsRes = await fetch("/api/snmp/traps");
      const trapsData = await trapsRes.json();
      setTraps(trapsData);

      const mappingRes = await fetch("/api/snmp/mappings");
      const mappingData = await mappingRes.json();
      setMappings(mappingData);
    } catch (err) {
      console.error("Failed gathering SNMP details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (devices.length > 0) {
      setSelectedDevice(devices[0].id);
    }
  }, [devices]);

  const handleTriggerTrapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'Viewer') {
      setNotification({
        type: "error",
        msg: "Unauthorized: Viewers are restricted from sending/triggering simulated SNMP Traps. Please shift privileges."
      });
      return;
    }

    try {
      setTriggerLoading(true);
      setNotification(null);

      const payload = {
        deviceId: isCustomNode ? undefined : selectedDevice,
        deviceIp: isCustomNode ? customIp : undefined,
        oid: selectedOid,
        message: customPayload,
        version: selectedVersion
      };

      const res = await fetch("/api/snmp/traps/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Trap injection failed");
      }

      await res.json();
      setNotification({
        type: "success",
        msg: `SNMP Trap (${selectedVersion.toUpperCase()}) triggered successfully! Alerts generated and SysLogs registered.`
      });
      fetchData();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      setNotification({ type: "error", msg: err.message || "Failed dispatching SNMP Packet." });
    } finally {
      setTriggerLoading(false);
    }
  };

  const handleOidChange = (oid: string) => {
    setSelectedOid(oid);
    const mapping = mappings.find(m => m.oid === oid);
    if (mapping) {
      if (oid === "1.3.6.1.6.3.1.1.5.3") {
        setCustomPayload("Physical interface GigabitEthernet0/1 carrier signal lost.");
      } else if (oid === "1.3.6.1.6.3.1.1.5.4") {
        setCustomPayload("Interface GigabitEthernet0/1 transitioned into UP state. Link synchronization negotiated at 1000Mbps.");
      } else if (oid === "1.3.6.1.4.1.9.9.43.1.1.1") {
        setCustomPayload("Running configuration sync completed. Snapshot copy to startup NVRAM successful by SSH user Admin.");
      } else if (oid === "1.3.6.1.6.3.1.1.5.1") {
        setCustomPayload("System Cold Start: Router restarted due to localized hardware power redundancy trip.");
      } else if (oid === "1.3.6.1.4.1.9.9.109.1.1.1") {
        setCustomPayload("CPU Utilization limit breached Warning: CPU load spiked to 92% handling high multicast stream frames inside VLAN 10.");
      } else if (oid === "1.3.6.1.4.1.1991.1.1.2.1.2") {
        setCustomPayload("BGP Peer Connection lost: Transit neighborship 172.16.0.1 closed. Keepalives timed out.");
      } else {
        setCustomPayload(`Detailed OID ${mapping.name} trap payload broadcast.`);
      }
    }
  };

  return (
    <div className="space-y-6" id="snmp-trap-console">
      
      {/* Upper header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0F1219] p-4 rounded-xl border border-slate-800 shadow-sm shadow-black/20">
        <div className="flex items-center gap-3">
          <Radio className="h-6 w-6 text-red-400 animate-pulse" />
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight font-sans">SNMP Trap Incident & Monitoring Receiver</h1>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">Real-time asynchronous alert listener capturing device notifications, mapping OID variables to event descriptions.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button 
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 text-xs bg-slate-800 hover:bg-slate-700 font-bold px-3 py-2 rounded-lg border border-slate-700 text-slate-200 transition-all cursor-pointer"
          >
            <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Scan Trap Registers
          </button>
        </div>
      </div>

      {notification && (
        <div className={`border rounded-xl p-4 flex items-start gap-3 animate-fadeIn ${
          notification.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`} id="snmp-notification bg">
          {notification.type === 'success' ? (
            <CheckCircle className="h-5 w-5 shrink-0 mt-0.5 animate-bounce" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          )}
          <div className="text-xs">
            <p className="font-bold">{notification.type === 'success' ? 'Signal Captured Successfully' : 'Execution Restalled'}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed opacity-90">{notification.msg}</p>
          </div>
        </div>
      )}

      {/* Main Grid split */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Side (2x wide): Trap Logs & MIB Catalog */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Live SNMP Traps captured */}
          <div className="bg-[#0F1219] rounded-xl border border-slate-800 overflow-hidden shadow-sm shadow-black/20">
            <div className="bg-slate-950 px-5 py-4 border-b border-slate-850 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-1.5 font-sans">
                  <Sliders className="h-4.5 w-4.5 text-indigo-400" />
                  Trap Buffer Registers Logs ({traps.length})
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Real-time incoming trap stack from managed devices and core border processors.</p>
              </div>
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping"></span>
            </div>

            <div className="divide-y divide-slate-850 max-h-[500px] overflow-y-auto">
              {loading ? (
                <div className="text-center py-12 text-slate-500">
                  <RotateCw className="h-5 w-5 animate-spin mx-auto text-indigo-400 mb-2" />
                  <span>Loading trap variables buffer registers...</span>
                </div>
              ) : traps.length === 0 ? (
                <div className="text-center py-12 text-slate-500 font-medium">
                  No SNMP traps captured inside current buffer session. Use the injector tool to send a simulated trap.
                </div>
              ) : (
                traps.map((trap) => (
                  <div key={trap.id} className="p-4 hover:bg-slate-950/20 transition-all select-text font-mono text-xs">
                    <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded font-extrabold text-[9px] uppercase ${
                          trap.severity === 'critical'
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : trap.severity === 'high'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                              : trap.severity === 'medium'
                                ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/25'
                                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                        }`}>
                          {trap.severity.toUpperCase()}
                        </span>
                        <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 font-bold px-1.5 py-0.5 rounded uppercase">
                          SNMP {trap.version.toUpperCase()}
                        </span>
                        <span className="text-white font-semibold">{trap.deviceName}</span>
                        <span className="text-slate-500">({trap.deviceIp})</span>
                      </div>
                      <span className="text-slate-500 text-[10px]">
                        {trap.timestamp.slice(11, 19)} UTC
                      </span>
                    </div>

                    <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-900 font-sans text-slate-350">
                      <div className="text-slate-400 font-semibold mb-1 text-[11px] leading-normal flex items-start gap-1">
                        <span className="text-indigo-400 font-mono flex-shrink-0 text-[10px] uppercase font-bold tracking-wider px-1 bg-indigo-950 rounded mr-0.5">Payload:</span>
                        <span>{trap.message}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        <span className="text-slate-400 font-bold">OID Path:</span> {trap.enterpriseOid}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 leading-normal italic bg-slate-900/50 p-1.5 rounded border border-dashed border-slate-800">
                        <span className="font-bold font-sans text-slate-300 not-italic">MIB Mapping Decode:</span> {trap.parsedDescription}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* MIB OID Catalog Table */}
          <div className="bg-[#0F1219] rounded-xl border border-slate-800 shadow-sm shadow-black/20">
            <div className="bg-slate-950 px-5 py-4 border-b border-slate-850">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-400" />
                Network Administration Engine - MIB Trap Translating Mappings
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Configured OIDs automatically mapped to custom event codes and severities in the Alerting Core System.</p>
            </div>
            
            <div className="overflow-x-auto text-[11px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/40 text-slate-400 font-bold uppercase text-[9px] border-b border-slate-850 tracking-wider">
                    <th className="px-5 py-3">MIB Code Name</th>
                    <th className="px-5 py-3">Variable Enterprise OID</th>
                    <th className="px-5 py-3">Rule Severity</th>
                    <th className="px-5 py-3">Human-Readable Outcome Definition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  {mappings.map((mapping) => (
                    <tr key={mapping.oid} className="hover:bg-slate-950/20 transition-all">
                      <td className="px-5 py-3 font-semibold text-white font-mono">{mapping.name}</td>
                      <td className="px-5 py-3 text-slate-400 font-mono">{mapping.oid}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-sans ${
                          mapping.defaultSeverity === "critical"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : mapping.defaultSeverity === "high"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
                        }`}>
                          {mapping.defaultSeverity}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-400 leading-normal max-w-sm">{mapping.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Side (1x wide): Test Trap Injector / Listener tool */}
        <div className="space-y-6">
          
          {/* Trap Simulator Injector Box */}
          <div className="bg-[#0F1219] p-5 rounded-xl border border-slate-800 shadow-sm shadow-black/20">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-3 mb-4">
              <Globe className="h-4 w-4 text-indigo-400 animate-spin" />
              Inject Simulated SNMP Trap
            </h3>

            <form onSubmit={handleTriggerTrapSubmit} className="space-y-4">
              
              {/* Node Source Type Selection */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Trap Originating Node</label>
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="origin-type"
                      checked={!isCustomNode}
                      onChange={() => setIsCustomNode(false)}
                      className="accent-indigo-500"
                    />
                    <span>Managed NOC Resource</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="origin-type"
                      checked={isCustomNode}
                      onChange={() => setIsCustomNode(true)}
                      className="accent-indigo-500"
                    />
                    <span>Custom IP Host</span>
                  </label>
                </div>

                {!isCustomNode ? (
                  <select
                    value={selectedDevice}
                    onChange={(e) => setSelectedDevice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg px-3 py-2 text-white outline-none cursor-pointer focus:border-indigo-500"
                  >
                    {devices.map(dev => (
                      <option key={dev.id} value={dev.id}>{dev.name} ({dev.ip})</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={customIp}
                    onChange={(e) => setCustomIp(e.target.value)}
                    placeholder="e.g. 192.168.1.1"
                    className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-indigo-500"
                  />
                )}
              </div>

              {/* SNMP Version Selection */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">SNMP Trap Format Version</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["v1", "v2c", "v3"] as const).map(ver => (
                    <button
                      type="button"
                      key={ver}
                      onClick={() => setSelectedVersion(ver)}
                      className={`py-1.5 rounded font-bold uppercase text-[10px] tracking-wide cursor-pointer border transition-all ${
                        selectedVersion === ver
                          ? "bg-indigo-600 text-white border-indigo-500"
                          : "bg-slate-950 text-slate-400 border-slate-850 hover:bg-slate-900"
                      }`}
                    >
                      Format {ver.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* MIB OID Select */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Event Notification OID</label>
                <select
                  value={selectedOid}
                  onChange={(e) => handleOidChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg px-3 py-2 text-white outline-none cursor-pointer focus:border-indigo-500 font-mono"
                >
                  {mappings.map(mapping => (
                    <option key={mapping.oid} value={mapping.oid}>{mapping.name} ({mapping.oid.substring(0, 16)}...)</option>
                  ))}
                </select>
              </div>

              {/* Trap Data Payload input */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Trap Message Payload</label>
                <textarea
                  rows={4}
                  value={customPayload}
                  onChange={(e) => setCustomPayload(e.target.value)}
                  placeholder="Insert custom SNMP variables payload..."
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg p-3 text-slate-200 font-mono text-[11px] leading-relaxed outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={triggerLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-lg border border-indigo-500 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md select-none"
              >
                {triggerLoading ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin" />
                    Dispatching Trap Packet...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Inject & Process SNMP Trap
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Engine specifications */}
          <div className="bg-[#0F1219] p-4 rounded-xl border border-dashed border-slate-800 text-xs text-slate-500 leading-relaxed font-mono select-none">
            <h4 className="font-bold text-slate-400 flex items-center gap-1.5 border-b border-slate-850 pb-2 mb-2 font-sans not-italic uppercase tracking-wider text-[10px]">
              <Settings className="h-4 w-4 text-indigo-400" />
              Engine Specifications
            </h4>
            <div className="space-y-1 text-[10px]">
              <div>• TRAP port: <span className="text-white">UDP 162/DEFAULT</span></div>
              <div>• ASN.1 parse engine: <span className="text-white">RFC-3413 compliants</span></div>
              <div>• OID translating map: <span className="text-white font-semibold">Enabled (sysUpTime, snmpTrapOID)</span></div>
              <div>• Host authentication filters: <span className="text-emerald-500 font-bold">Enabled</span></div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
