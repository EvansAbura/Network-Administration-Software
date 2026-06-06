import React, { useState } from "react";
import { FirewallRule, UserRole, SysLog } from "../types";
import { 
  Shield, 
  UserCheck, 
  Lock, 
  AlertTriangle, 
  Plus, 
  FolderPlus, 
  Power, 
  Grid, 
  HelpCircle,
  Activity,
  Bot,
  Zap
} from "lucide-react";

interface SecurityProps {
  firewallRules: FirewallRule[];
  role: UserRole;
  logs: SysLog[];
  onSetRole: (role: UserRole) => Promise<void>;
  onAddFirewallRule: (rule: Omit<FirewallRule, "id" | "enabled">) => Promise<void>;
  onToggleFirewallRule: (id: string, enabled: boolean) => Promise<void>;
}

export default function SecurityConsole({
  firewallRules,
  role,
  logs,
  onSetRole,
  onAddFirewallRule,
  onToggleFirewallRule
}: SecurityProps) {
  // Add rule state variables
  const [showAddForm, setShowAddForm] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [ruleAction, setRuleAction] = useState<'ALLOW' | 'DENY'>("DENY");
  const [ruleProtocol, setRuleProtocol] = useState<'TCP' | 'UDP' | 'ICMP' | 'ANY'>("TCP");
  const [ruleSrcIp, setRuleSrcIp] = useState("ANY");
  const [ruleDestIp, setRuleDestIp] = useState("10.0.");
  const [rulePort, setRulePort] = useState("22");
  const [rulePriority, setRulePriority] = useState<number>(60);

  // IDS Anomaly event simulator
  const [idsIncidents, setIdsIncidents] = useState<any[]>([
    { id: "inc-1", timestamp: new Date(Date.now() - 300000).toISOString(), scannerIp: "185.220.101.5", targetPort: "22 (SSH)", type: "TCP SYN Flood Attack", severity: "HIGH", status: "Active" },
    { id: "inc-2", timestamp: new Date(Date.now() - 600000).toISOString(), scannerIp: "198.51.100.42", targetPort: "3389 (RDP)", type: "Brute Force Scan Attempt", severity: "MEDIUM", status: "Mitigated" }
  ]);

  const isViewer = role === "Viewer";

  const handleCreateRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) {
      alert("Unauthorized. Viewers are restricted from creating security rules.");
      return;
    }
    if (!ruleName) {
      alert("Priority Rule Name is required.");
      return;
    }

    await onAddFirewallRule({
      priority: rulePriority,
      action: ruleAction,
      protocol: ruleProtocol,
      sourceIp: ruleSrcIp,
      destIp: ruleDestIp,
      port: rulePort,
      name: ruleName
    });

    // Reset controls
    setRuleName("");
    setRuleSrcIp("ANY");
    setRuleDestIp("10.0.");
    setRulePort("22");
    setShowAddForm(false);
  };

  // One-click Block attacker function for IDS integration
  const handleQuickBlockIp = async (ip: string, name: string) => {
    if (isViewer) {
      alert("Unauthorized: Viewer is restricted from editing live gate firewalls.");
      return;
    }

    try {
      await onAddFirewallRule({
        priority: 5, // Top priority rule block
        action: "DENY",
        protocol: "ANY",
        sourceIp: ip,
        destIp: "ANY",
        port: "ANY",
        name: `IDS Auto-Block: Mitigate Rogue ${name}`
      });

      // Update local incident status to Mitigated
      setIdsIncidents(prev => prev.map(inc => {
        if (inc.scannerIp === ip) {
          return { ...inc, status: "Mitigated" };
        }
        return inc;
      }));

      alert(`IDS Auto-block SUCCESS: Priority rule 5 successfully committed. Dropping packets from ${ip}.`);
    } catch (err) {
      alert("Failed injecting block rule in security gateway.");
    }
  };

  // Switch Role Utility
  const handleSwitchRole = async (targetRole: UserRole) => {
    await onSetRole(targetRole);
  };

  // Get active security audit trails
  const securityLogs = logs.filter(l => l.category === 'SECURITY' || l.category === 'AUTH').slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Upper Security header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0F1219] p-4 rounded-xl border border-slate-800 shadow-sm shadow-black/20">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-red-400" />
          <div>
            <h2 className="text-base font-semibold text-white">Security Controls & Policies</h2>
            <p className="text-xs text-slate-400">Configure corporate gateway access rules, RBAC authorization parameters, and intercept IPS alarms.</p>
          </div>
        </div>

        {/* Roles select */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-805">
          <span className="text-[10px] text-slate-500 font-bold px-2.5 uppercase select-none">Auth Role:</span>
          {["Admin", "Network Engineer", "Viewer"].map((r) => (
            <button
              key={r}
              onClick={() => handleSwitchRole(r as UserRole)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold tracking-wider cursor-pointer transition-all ${
                role === r 
                  ? "bg-slate-800 text-white shadow-md border border-slate-705" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Role explanation widget */}
      <div className="bg-[#0F1219] p-4 rounded-xl border border-slate-800 shadow-sm shadow-black/20 flex items-start gap-3">
        <UserCheck className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-white">Role-Based Access Control (RBAC) Sandbox</p>
          <p className="text-slate-400 leading-relaxed">
            {role === 'Admin' && "👑 ADMINISTRATOR PROFILES: You have full hardware configuration, sweeper scans, and security firewall rule capabilities."}
            {role === 'Network Engineer' && "⚙️ NETWORK ENGINEER PROFILES: You can execute scans, diagnostics traceroutes, and toggle firewall ports, but cannot delete registered core appliances."}
            {role === 'Viewer' && "🔒 READ-ONLY VIEWER PROFILES: You have viewer diagnostics. Writing actions, registers, reboots, and firewall creations are disabled across the interface."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Firewall policy tables */}
        <div className="bg-[#0F1219] rounded-xl border border-slate-800 overflow-hidden lg:col-span-2 flex flex-col justify-between shadow-sm shadow-black/20">
          <div>
            <div className="bg-slate-950 px-5 py-4 border-b border-slate-800/80 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-white">Edge Firewall Rule Tables</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Rules are checked in top-down sequential priority order (lowest ID first).</p>
              </div>
              <button
                onClick={() => {
                  if (isViewer) {
                    alert("Acess Denied: Viewers cannot create firewall rules.");
                  } else {
                    setShowAddForm(true);
                  }
                }}
                className={`flex items-center gap-1.5 bg-indigo-650 hover:bg-indigo-550 text-white text-xs px-3 py-1.5 rounded border border-indigo-500/20 cursor-pointer transition-all ${
                  isViewer ? "opacity-45 cursor-not-allowed" : ""
                }`}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Firewall Policy
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800/50 font-semibold select-none">
                    <th className="p-3.5 text-center">Priority</th>
                    <th className="p-3.5">Policy / Rule Name</th>
                    <th className="p-3.5">Action</th>
                    <th className="p-3.5">Protocol</th>
                    <th className="p-3.5">Source Node IP</th>
                    <th className="p-3.5">Dest Service IP</th>
                    <th className="p-3.5">Port</th>
                    <th className="p-3.5 text-center">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {firewallRules.map(rule => (
                    <tr 
                      key={rule.id}
                      className={`hover:bg-slate-900/25 ${!rule.enabled ? 'opacity-40' : ''}`}
                    >
                      <td className="p-3.5 text-center font-mono font-bold text-slate-400">{rule.priority}</td>
                      <td className="p-3.5 font-semibold text-slate-200">{rule.name}</td>
                      <td className="p-3.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          rule.action === 'ALLOW' ? 'bg-emerald-950/40 text-emerald-400' : 'bg-rose-950/40 text-red-400'
                        }`}>
                          {rule.action}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-[10px] text-slate-300">{rule.protocol}</td>
                      <td className="p-3.5 font-mono text-[10px] text-slate-400 truncate max-w-[100px]">{rule.sourceIp}</td>
                      <td className="p-3.5 font-mono text-[10px] text-slate-400 truncate max-w-[100px]">{rule.destIp}</td>
                      <td className="p-3.5 font-mono text-[10px] text-indigo-400">{rule.port}</td>
                      <td className="p-3.5 text-center" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            if (isViewer) {
                              alert("Viewer role cannot toggle system firewalls.");
                            } else {
                              onToggleFirewallRule(rule.id, !rule.enabled);
                            }
                          }}
                          disabled={isViewer}
                          className={`p-1 bg-slate-950 hover:bg-slate-850 rounded border border-slate-800 hover:border-slate-700 transition` }
                        >
                          <Power className={`h-3.5 w-3.5 ${rule.enabled ? 'text-emerald-400' : 'text-slate-500'}`} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="p-4 border-t border-slate-800/40 text-[10px] text-slate-500 font-mono">
            TOTAL FIREWALL CONTROLS REGISTERED: {firewallRules.length} • MITIGATION ENGINE: IPS V3 LAYER4 FILTERING
          </div>
        </div>

        {/* Right column: IDS / IPS alarm centers & Security Audit trail */}
        <div className="space-y-6">
          {/* IPS Alert Module */}
          <div className="bg-[#0F1117] p-5 rounded-xl border border-slate-800 space-y-4 shadow-sm shadow-black/20">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-805 pb-2.5">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-400 animate-pulse" />
              Intrusion Detection System (IDS)
            </h3>
            
            <div className="space-y-4">
              {idsIncidents.map(inc => (
                <div 
                  key={inc.id}
                  className={`p-3.5 rounded-lg border text-xs space-y-2 relative transition-opacity ${
                    inc.status === "Mitigated" 
                      ? "bg-slate-950/40 border-slate-800 text-slate-400" 
                      : "bg-red-950/35 border-red-900/45 text-rose-300"
                  }`}
                >
                  <div className="flex justify-between items-center select-none">
                    <span className="font-mono text-[9px] text-slate-500">{new Date(inc.timestamp).toLocaleTimeString()}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      inc.status === 'Mitigated' ? 'bg-slate-900 text-slate-400' : 'bg-red-900 text-white animate-pulse'
                    }`}>
                      {inc.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white text-xs">{inc.type}</h4>
                    <p className="text-[10pt] text-slate-400 mt-1">Origin scanner host: <span className="font-mono font-bold text-red-300">{inc.scannerIp}</span> bound on SSH port {inc.targetPort}.</p>
                  </div>

                  {inc.status === "Active" && (
                    <button
                      onClick={() => handleQuickBlockIp(inc.scannerIp, inc.type)}
                      className="w-full mt-2 py-1.5 bg-red-650 hover:bg-red-550 border border-red-600 rounded text-red-100 font-semibold uppercase text-[10px] cursor-pointer"
                    >
                      Instantly Inject Block Rule (Mitigate)
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Core Security SysLogs logs */}
          <div className="bg-[#0F1117] p-5 rounded-xl border border-slate-800 space-y-3 shadow-sm shadow-black/20">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="h-4.5 w-4.5 text-indigo-400" />
              Access & Security Events
            </h3>

            <div className="space-y-2.5">
              {securityLogs.map(log => (
                <div key={log.id} className="text-[11px] font-mono leading-relaxed bg-slate-950/60 p-2.5 border border-slate-900 rounded">
                  <div className="flex justify-between items-center text-slate-500 font-semibold mb-1 select-none">
                    <span>{log.device}</span>
                    <span className={log.severity === 'CRITICAL' ? 'text-rose-500' : 'text-amber-400'}>{log.severity}</span>
                  </div>
                  <p className="text-slate-300">{log.message}</p>
                </div>
              ))}
              
              {securityLogs.length === 0 && (
                <p className="text-center text-slate-500 text-xs py-4">No recent authentication or policy block events logged.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Firewall dialog modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form 
            onSubmit={handleCreateRuleSubmit}
            className="bg-slate-900 rounded-xl border border-slate-800 w-full max-w-lg overflow-hidden shadow-2xl space-y-4"
          >
            <div className="bg-slate-950 px-5 py-4 border-b border-slate-800/80 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-white">Create New Firewall Access Rules</h3>
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
                  <label className="text-slate-400 font-medium">Policy Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Reject Rogue Admin Attempt"
                    value={ruleName}
                    onChange={e => setRuleName(e.target.value)}
                    className="bg-slate-950 text-slate-200 p-2.5 w-full rounded border border-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Priority Index (1-100) *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={rulePriority}
                    onChange={e => setRulePriority(+e.target.value)}
                    className="bg-slate-950 text-slate-200 p-2.5 w-full rounded border border-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Rule Action *</label>
                  <select
                    value={ruleAction}
                    onChange={e => setRuleAction(e.target.value as 'ALLOW' | 'DENY')}
                    className="bg-slate-950 text-slate-300 p-2.5 w-full rounded border border-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="ALLOW">ALLOW</option>
                    <option value="DENY">DENY (drop)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">IP Protocol *</label>
                  <select
                    value={ruleProtocol}
                    onChange={e => setRuleProtocol(e.target.value as any)}
                    className="bg-slate-950 text-slate-300 p-2.5 w-full rounded border border-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="TCP">TCP</option>
                    <option value="UDP">UDP</option>
                    <option value="ICMP">ICMP</option>
                    <option value="ANY">IP (ANY)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Port / Service *</label>
                  <input
                    type="text"
                    placeholder="e.g. 5432, ANY"
                    required
                    value={rulePort}
                    onChange={e => setRulePort(e.target.value)}
                    className="bg-slate-950 text-slate-200 p-2.5 w-full rounded border border-slate-800 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Source IP/CIDR Block *</label>
                  <input
                    type="text"
                    required
                    value={ruleSrcIp}
                    onChange={e => setRuleSrcIp(e.target.value)}
                    className="bg-slate-950 text-slate-200 p-2.5 w-full rounded border border-slate-800 focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Destination IP/CIDR Block *</label>
                  <input
                    type="text"
                    required
                    value={ruleDestIp}
                    onChange={e => setRuleDestIp(e.target.value)}
                    className="bg-slate-950 text-slate-200 p-2.5 w-full rounded border border-slate-800 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-4 border-t border-slate-800 flex justify-end gap-3.5">
              <button 
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold px-4 py-2 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-2 rounded-lg cursor-pointer"
              >
                Apply Security Rule
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
