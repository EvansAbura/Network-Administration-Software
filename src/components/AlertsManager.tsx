import React, { useState } from "react";
import { NetworkAlert, ThresholdConfig, UserRole } from "../types";
import { 
  AlertTriangle, 
  Settings, 
  CheckCircle, 
  Trash2, 
  BellRing, 
  SlidersHorizontal,
  Mail,
  Smartphone,
  Sparkles,
  Cpu,
  RefreshCw,
  Zap,
  Check,
  Calendar
} from "lucide-react";

interface AlertsProps {
  alerts: NetworkAlert[];
  thresholds: ThresholdConfig;
  role: UserRole;
  onAcknowledgeAlert: (id: string) => Promise<void>;
  onClearAlerts: () => Promise<void>;
  onUpdateThresholds: (thresholds: ThresholdConfig) => Promise<void>;
}

export default function AlertsManager({
  alerts,
  thresholds,
  role,
  onAcknowledgeAlert,
  onClearAlerts,
  onUpdateThresholds
}: AlertsProps) {
  // Local changes for sliders
  const [cpuVal, setCpuVal] = useState(thresholds.cpuLimit);
  const [ramVal, setRamVal] = useState(thresholds.ramLimit);
  const [latencyVal, setLatencyVal] = useState(thresholds.latencyLimit);
  const [packetLossVal, setPacketLossVal] = useState(thresholds.packetLossLimit);
  const [notifCheck, setNotifCheck] = useState(thresholds.enableNotifications);
  const [emailInp, setEmailInp] = useState(thresholds.emailRecipient);
  const [smsInp, setSmsInp] = useState(thresholds.smsRecipient);

  // Gemini Predictive analysis state
  const [loadingPredict, setLoadingPredict] = useState(false);
  const [predictOutput, setPredictOutput] = useState("");

  const isViewer = role === "Viewer";
  const [savingSettings, setSavingSettings] = useState(false);

  // Update Settings submission
  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) {
      alert("Acess Denied: Read-only viewers cannot configure thresholds.");
      return;
    }
    setSavingSettings(true);
    try {
      await onUpdateThresholds({
        cpuLimit: cpuVal,
        ramLimit: ramVal,
        latencyLimit: latencyVal,
        packetLossLimit: packetLossVal,
        enableNotifications: notifCheck,
        emailRecipient: emailInp,
        smsRecipient: smsInp
      });
      alert("NOC thresholds updated successfully! Live devices will recalculate warning parameters instantly.");
    } catch {
      alert("Failed storing thresholds parameters.");
    } finally {
      setSavingSettings(false);
    }
  };

  // Call Gemini predictive failures service
  const handleTriggerAIPredictions = async () => {
    setLoadingPredict(true);
    setPredictOutput("");
    try {
      const response = await fetch("/api/gemini/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json();
      if (data.analysis) {
        setPredictOutput(data.analysis);
      } else if (data.error) {
        setPredictOutput(`AI Anomaly Engine Error: ${data.error}`);
      }
    } catch {
      setPredictOutput("Failed to connect to the custom predictive analytics API.");
    } finally {
      setLoadingPredict(false);
    }
  };

  const getSeverityBadge = (sev: NetworkAlert["severity"]) => {
    switch (sev) {
      case "critical": return "bg-rose-950/40 text-rose-400 border-rose-900/40";
      case "high": return "bg-orange-950/40 text-orange-400 border-orange-900/40";
      case "medium": return "bg-amber-955/40 text-amber-500 border-amber-900/40";
      case "low": return "bg-slate-950/40 text-slate-400 border-slate-900/40";
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Manager Overview */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0F1219] p-4 rounded-xl border border-slate-800 shadow-sm shadow-black/20">
        <div className="flex items-center gap-3">
          <BellRing className="h-6 w-6 text-amber-400" />
          <div>
            <h2 className="text-base font-semibold text-white">Alerts & System Alarms</h2>
            <p className="text-xs text-slate-400">Manage real-time SNMP alarm logs, customize resource thresholds limits, and run AI predictive failure analysis.</p>
          </div>
        </div>

        <button
          onClick={() => {
            if (isViewer) {
              alert("Unauthorized: Viewer is restricted from editing live databases.");
            } else {
              onClearAlerts();
            }
          }}
          disabled={isViewer}
          className={`flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs px-3.5 py-2 rounded-lg border border-slate-700/60 cursor-pointer transition-all ${
            isViewer ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <Trash2 className="h-3.5 w-3.5 text-rose-400" />
          Purge Resolved Alerts
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left and Middle column: Active Alarms list & Threshold limit dial */}
        <div className="space-y-6 lg:col-span-2">
          {/* Real-time thresh adjusters */}
          <div className="bg-[#0F1219] p-5 rounded-xl border border-slate-800 shadow-sm shadow-black/20">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2 border-b border-slate-805 pb-2 ml-0.5">
              <SlidersHorizontal className="h-4.5 w-4.5 text-indigo-400" />
              Adjust Telemetry Thresholds Limits
            </h3>

            <form onSubmit={handleSaveThresholds} className="space-y-5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Latency limit slider */}
                <div className="space-y-2 bg-slate-950/40 p-3 rounded border border-slate-900">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Ping Delay Warning threshold</span>
                    <span className="font-mono text-indigo-400 font-bold">{latencyVal} ms</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="500"
                    step="5"
                    value={latencyVal}
                    onChange={e => setLatencyVal(+e.target.value)}
                    disabled={isViewer}
                    className="w-full bg-slate-800 accent-indigo-500 h-1 rounded-full cursor-pointer"
                  />
                </div>

                {/* Packet Loss slider */}
                <div className="space-y-2 bg-slate-950/40 p-3 rounded border border-slate-900">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Intermittent Packet Loss warning</span>
                    <span className="font-mono text-indigo-400 font-bold">{packetLossVal} %</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.1"
                    value={packetLossVal}
                    onChange={e => setPacketLossVal(+e.target.value)}
                    disabled={isViewer}
                    className="w-full bg-slate-800 accent-indigo-500 h-1 rounded-full cursor-pointer"
                  />
                </div>

                {/* CPU slider */}
                <div className="space-y-2 bg-slate-950/40 p-3 rounded border border-slate-900">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">CPU Usage warning bounds</span>
                    <span className="font-mono text-indigo-400 font-bold">{cpuVal} %</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="95"
                    value={cpuVal}
                    onChange={e => setCpuVal(+e.target.value)}
                    disabled={isViewer}
                    className="w-full bg-slate-800 accent-indigo-500 h-1 rounded-full cursor-pointer"
                  />
                </div>

                {/* RAM slider */}
                <div className="space-y-2 bg-slate-950/40 p-3 rounded border border-slate-900">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">RAM Load warning bounds</span>
                    <span className="font-mono text-indigo-400 font-bold">{ramVal} %</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="95"
                    value={ramVal}
                    onChange={e => setRamVal(+e.target.value)}
                    disabled={isViewer}
                    className="w-full bg-slate-800 accent-indigo-500 h-1 rounded-full cursor-pointer"
                  />
                </div>
              </div>

              {/* Notification targets setup */}
              <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-850 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <BellRing className="h-4 w-4 text-indigo-400 mt-0.5" />
                    <div>
                      <span className="text-slate-300 font-semibold uppercase text-[10px] tracking-wider block">Integrate Administrative SMTP & SMS Alerts</span>
                      <span className="text-slate-500 text-[10px]">Toggles active notification hooks when thresholds are exceeded.</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifCheck}
                    onChange={e => setNotifCheck(e.target.checked)}
                    disabled={isViewer}
                    className="h-4.5 w-4.5 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-800 cursor-pointer accent-indigo-500"
                  />
                </div>

                {notifCheck && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1"><Mail className="h-3 w-3" /> E-Email Recipient</span>
                      <input
                        type="email"
                        value={emailInp}
                        onChange={e => setEmailInp(e.target.value)}
                        disabled={isViewer}
                        className="bg-slate-900 text-slate-200 p-2.5 rounded border border-slate-800 focus:outline-none w-full font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1"><Smartphone className="h-3 w-3" /> SMS Recipient Mobile</span>
                      <input
                        type="text"
                        value={smsInp}
                        onChange={e => setSmsInp(e.target.value)}
                        disabled={isViewer}
                        className="bg-slate-900 text-slate-200 p-2.5 rounded border border-slate-800 focus:outline-none w-full font-mono text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {!isViewer && (
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2 rounded-lg cursor-pointer border border-indigo-500/20 active:scale-95 transition-all"
                  >
                    {savingSettings && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                    Commit Limits Thresholds
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Active unacknowledged Alerts logs */}
          <div className="bg-[#0F1219] rounded-xl border border-slate-800 overflow-hidden shadow-sm shadow-black/20">
            <div className="bg-slate-950 px-5 py-4 border-b border-slate-850">
              <h3 className="text-sm font-semibold text-white">Live SNMP Alerts Logs</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Logged errors originating from core router BGP queries, CPU loads, or security firewall events.</p>
            </div>

            <div className="divide-y divide-slate-855 select-none">
              {alerts.map(alt => (
                <div 
                  key={alt.id}
                  className={`p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-colors ${
                    alt.acknowledged ? "bg-slate-950/20 opacity-50" : "bg-slate-900/20 hover:bg-slate-900/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 border mt-0.5 ${getSeverityBadge(alt.severity)}`}>
                      {alt.severity}
                    </span>
                    <div>
                      <h4 className="font-semibold text-slate-200 text-xs flex items-center gap-2">
                        {alt.source}
                        <span className="text-[10px] text-slate-500 font-mono font-normal">
                          {new Date(alt.timestamp).toLocaleTimeString()}
                        </span>
                      </h4>
                      <p className="text-slate-400 text-xs mt-1 leading-relaxed max-w-xl">{alt.message}</p>
                    </div>
                  </div>

                  {!alt.acknowledged && (
                    <button
                      onClick={() => {
                        if (isViewer) {
                          alert("Acess Denied: Viewer is restricted from acknowledging alarms.");
                        } else {
                          onAcknowledgeAlert(alt.id);
                        }
                      }}
                      disabled={isViewer}
                      className={`flex items-center gap-1 bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/60 transition-colors text-xs py-1 px-2.5 rounded cursor-pointer ${
                        isViewer ? "opacity-45" : ""
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Acknowledge
                    </button>
                  )}
                </div>
              ))}

              {alerts.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs">
                  All systems operating within standard threshold limits. No warnings logged!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: AI based anomaly/predictive failure charts and analyses */}
        <div className="bg-[#0F1219] p-5 rounded-xl border border-slate-800 flex flex-col justify-between min-h-[500px] shadow-sm shadow-black/20">
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="bg-indigo-600/10 p-2 rounded-lg border border-indigo-800/20 shrink-0">
                <Sparkles className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">AI Advanced Predictive Failure Analysis</h3>
                <p className="text-xs text-slate-400 mt-0.5">Reads logs and latency spikes over time to predict routing outages or STP packet storm congestions.</p>
              </div>
            </div>

            <button
              onClick={handleTriggerAIPredictions}
              disabled={loadingPredict}
              className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-550 disabled:bg-indigo-900 active:scale-95 transition-all text-white font-semibold text-xs rounded-lg border border-indigo-500/20 cursor-pointer flex items-center justify-center gap-2 select-none"
            >
              {loadingPredict ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-white" />
                  Running Predictive Calculations...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 text-amber-300" />
                  Analyze Failure Predictability
                </>
              )}
            </button>

            {predictOutput ? (
              <div className="bg-slate-950/90 p-4 rounded-lg border border-slate-850 font-sans text-xs leading-relaxed text-slate-300 mt-2 h-96 overflow-y-auto animate-fadeIn max-w-full">
                <div className="prose prose-invert prose-xs">
                  {predictOutput.split("\n").map((line, idx) => {
                    if (line.startsWith("###")) {
                      return <h4 key={idx} className="text-xs font-bold text-white mt-3 mb-1 font-sans border-b border-indigo-950 pb-0.5 flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-indigo-400" /> {line.replace(/###/g, "").trim()}</h4>;
                    }
                    if (line.includes("Anomaly Score") || line.includes("Predict")) {
                      return <p key={idx} className="font-semibold text-indigo-200 mt-1.5">{line}</p>;
                    }
                    if (line.startsWith("-") || line.startsWith("*")) {
                      return <li key={idx} className="ml-3 list-disc text-slate-300 mb-0.5">{line.replace(/^[-*]\s*/, "")}</li>;
                    }
                    if (line.trim() === "") return <div key={idx} className="h-1.5"></div>;
                    return <p key={idx} className="text-slate-300 leading-relaxed mb-0.5">{line}</p>;
                  })}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-850 rounded-lg flex flex-col items-center justify-center gap-3">
                <AlertTriangle className="h-8 w-8 text-slate-800 animate-pulse" />
                <span>Execute the predictive diagnosis calculation to read syslog telemetry trends inside Gemini and construct risk indices files.</span>
              </div>
            )}
          </div>

          <div className="border-t border-slate-800 pt-4 mt-4 text-[10px] text-slate-500 font-mono flex items-center gap-1 select-none">
            <Calendar className="h-3.5 w-3.5 text-slate-600" />
            <span>LAST ESTIMATE MODEL RUN: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
