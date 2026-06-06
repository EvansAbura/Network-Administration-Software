import React, { useState } from "react";
import { SysLog, LogSeverity, LogCategory } from "../types";
import { 
  FileText, 
  Search, 
  Download, 
  Filter, 
  RefreshCw, 
  ShieldAlert, 
  Cpu, 
  Activity, 
  Key,
  Calendar,
  Layers
} from "lucide-react";

interface LogsProps {
  logs: SysLog[];
  onRefreshAll: () => void;
}

export default function LogsExplorer({ logs, onRefreshAll }: LogsProps) {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Filtering actions
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(search.toLowerCase()) || 
                          log.device.toLowerCase().includes(search.toLowerCase()) || 
                          log.ip.includes(search);
    const matchesSeverity = severityFilter === "all" || log.severity === severityFilter;
    const matchesCategory = categoryFilter === "all" || log.category === categoryFilter;
    return matchesSearch && matchesSeverity && matchesCategory;
  });

  const getSeverityStyle = (sev: LogSeverity) => {
    switch (sev) {
      case "EMERGENCY":
      case "CRITICAL":
        return "text-rose-400 bg-rose-950/40 border-rose-900/40";
      case "WARNING":
        return "text-amber-400 bg-amber-955/40 border-amber-900/40";
      case "INFO":
        return "text-indigo-400 bg-indigo-950/40 border-indigo-900/40";
      case "DEBUG":
        return "text-slate-400 bg-slate-950 border-slate-900";
    }
  };

  const getCategoryIcon = (cat: LogCategory) => {
    switch (cat) {
      case "SECURITY": return <ShieldAlert className="h-3.5 w-3.5 text-red-400" />;
      case "SYSTEM": return <Cpu className="h-3.5 w-3.5 text-purple-400" />;
      case "TRAFFIC": return <Activity className="h-3.5 w-3.5 text-emerald-400" />;
      case "AUTH": return <Key className="h-3.5 w-3.5 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Logs Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0F1219] p-4 rounded-xl border border-slate-800 shadow-sm shadow-black/20">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-indigo-400" />
          <div>
            <h2 className="text-base font-semibold text-white">Centralized Syslog DB & Audit Trail</h2>
            <p className="text-xs text-slate-400">Search system events, SSH authentications, and traffic metrics gathered via local routing snmp daemons.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={onRefreshAll}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3.5 py-2 rounded-lg border border-slate-705 cursor-pointer font-medium active:scale-95 transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Sync Logs
          </button>
          
          <a
            href="/api/logs/export"
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3.5 py-2 rounded-lg border border-emerald-500/20 font-semibold cursor-pointer active:scale-95 transition-all select-none"
          >
            <Download className="h-3.5 w-3.5" />
            Export Audit CSV
          </a>
        </div>
      </div>

      {/* Filter and Query ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#0F1219] p-4 rounded-xl border border-slate-800 shadow-sm shadow-black/20">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search payload keywords, IP, elements..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-slate-950 text-slate-100 text-xs pl-9 pr-4 py-2 w-full rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500 font-sans"
          />
        </div>

        <select
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value)}
          className="bg-slate-950 text-slate-300 text-xs px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="all">ALL SEVERITIES</option>
          <option value="EMERGENCY">EMERGENCY / CRITICAL</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="WARNING">WARNING</option>
          <option value="INFO">INFO</option>
          <option value="DEBUG">DEBUG</option>
        </select>

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="bg-slate-950 text-slate-300 text-xs px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="all">ALL EVENT CATEGORIES</option>
          <option value="SYSTEM">CORE SYSTEM EVENTS</option>
          <option value="SECURITY">GATEWAY POLICY IDS</option>
          <option value="TRAFFIC">ROUTE & TRUNK THROUGHPUT</option>
          <option value="AUTH">USER PRIVILEGE AUDITS</option>
        </select>
      </div>

      {/* Syslogs Table */}
      <div className="bg-[#0F1219] rounded-xl border border-slate-800 overflow-hidden shadow-sm shadow-black/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800/80 font-semibold select-none">
                <th className="p-4"><span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-slate-500" /> Timestamp</span></th>
                <th className="p-4">Severity</th>
                <th className="p-4">Category</th>
                <th className="p-4">Element Source</th>
                <th className="p-4">IP Address</th>
                <th className="p-4">Audit Syslog Payload Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-855 font-mono">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-900/15 transition-colors">
                  <td className="p-4 text-slate-500 truncate text-[11px] whitespace-nowrap">
                    {new Date(log.timestamp).toISOString().replace("T", " ").substring(0, 19)}
                  </td>
                  <td className="p-4 select-none">
                    <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${getSeverityStyle(log.severity)}`}>
                      {log.severity}
                    </span>
                  </td>
                  <td className="p-4 select-none">
                    <span className="flex items-center gap-1.5 text-slate-300 capitalize text-[11px]">
                      {getCategoryIcon(log.category)}
                      {log.category.toLowerCase()}
                    </span>
                  </td>
                  <td className="p-4 text-slate-200 font-semibold truncate max-w-[140px]">{log.device}</td>
                  <td className="p-4 text-indigo-400 font-bold truncate max-w-[110px]">{log.ip}</td>
                  <td className="p-4 text-slate-300 leading-normal max-w-xl text-[11px]">
                    {log.message}
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr className="select-none">
                  <td colSpan={6} className="p-12 text-center text-slate-500 font-medium">
                    No matching network syslog records found in memory. Adjust filter parameters or trigger a refresh sync.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-slate-950 px-4 py-3 border-t border-slate-855 text-[10px] text-slate-500 flex justify-between items-center font-mono select-none">
          <span className="flex items-center gap-1.5 uppercase"><Layers className="h-3.5 w-3.5 text-slate-600" /> buffer state allocation queue: {filteredLogs.length} of {logs.length} registry entries</span>
          <span>RFC-5424 COMPILED SYSLOG FORMAT</span>
        </div>
      </div>
    </div>
  );
}
