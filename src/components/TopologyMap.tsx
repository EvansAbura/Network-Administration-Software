import React, { useState, useRef, useEffect } from "react";
import { TopologyNode, TopologyLink, NetworkDevice } from "../types";
import { 
  Network, 
  Cpu, 
  Smartphone, 
  Database, 
  HelpCircle, 
  Zap, 
  Maximize2, 
  Filter, 
  Eye, 
  Settings,
  AlertOctagon,
  RefreshCw,
  Sliders
} from "lucide-react";

interface TopologyProps {
  nodes: TopologyNode[];
  links: TopologyLink[];
  devices: NetworkDevice[];
  onUpdateNodeCoordinates: (id: string, x: number, y: number) => Promise<void>;
  onRefreshAll: () => void;
}

export default function TopologyMap({
  nodes,
  links,
  devices,
  onUpdateNodeCoordinates,
  onRefreshAll
}: TopologyProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Layout View Toggles
  const [activeLayer, setActiveLayer] = useState<string>("all");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isZoomedIn, setIsZoomedIn] = useState<boolean>(false);

  // Drag-and-drop interaction state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Get matching device information
  const getDeviceForNode = (node: TopologyNode) => {
    return devices.find(d => d.id === node.deviceId);
  };

  // Node class categories
  const filteredNodes = nodes.filter(node => {
    if (activeLayer === "all") return true;
    if (activeLayer === "core-infra" && (node.type === "core" || node.type === "firewall")) return true;
    if (activeLayer === "distribution" && node.type === "distribution") return true;
    if (activeLayer === "edge-access" && node.type === "edge") return true;
    if (activeLayer === "servers" && node.type === "server") return true;
    return false;
  });

  // Link status indicators
  const getLinkColor = (status: 'up' | 'congested' | 'down') => {
    switch (status) {
      case "up": return "#22c55e"; // Emerald
      case "congested": return "#fbbf24"; // Amber
      case "down": return "#ef4444"; // Rose
    }
  };

  const getLinkStyle = (status: 'up' | 'congested' | 'down') => {
    switch (status) {
      case "up": return "stroke-emerald-400";
      case "congested": return "stroke-amber-400 stroke-dasharray-[4]";
      case "down": return "stroke-rose-500 stroke-dasharray-[5]";
    }
  };

  // Drag Initiator
  const handleNodeDragStart = (e: React.MouseEvent, node: TopologyNode) => {
    e.preventDefault();
    setDraggingNodeId(node.id);
    
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setDragOffset({
        x: x - node.x,
        y: y - node.y
      });
    }
  };

  // Drag Movement Processor
  const handleSvgDragMove = (e: React.MouseEvent) => {
    if (!draggingNodeId || !svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    // Boundary constraints
    const nextX = Math.max(20, Math.min(780, cursorX - dragOffset.x));
    const nextY = Math.max(20, Math.min(530, cursorY - dragOffset.y));

    // Update coordinate state client side in-place for smooth tracking
    const targetNode = nodes.find(n => n.id === draggingNodeId);
    if (targetNode) {
      targetNode.x = Math.round(nextX);
      targetNode.y = Math.round(nextY);
    }
  };

  // Drag Release Commit
  const handleSvgDragEnd = async () => {
    if (!draggingNodeId) return;
    
    const targetNode = nodes.find(n => n.id === draggingNodeId);
    if (targetNode) {
      // Push coordinates back to server persistency layer
      try {
        await onUpdateNodeCoordinates(targetNode.id, targetNode.x, targetNode.y);
      } catch (err) {
        console.error("Failed to persist coordinate adjustments in DB backend.");
      }
    }
    setDraggingNodeId(null);
  };

  // Find Node coordinate helpers
  const getCoordinatesForNode = (id: string) => {
    const node = nodes.find(n => n.id === id);
    if (node) return { x: node.x, y: node.y, status: getDeviceForNode(node)?.status || 'healthy' };
    return { x: 0, y: 0, status: 'healthy' };
  };

  // Icon matcher
  const getNodeSymbol = (type: string, status: string) => {
    let iconColor = "text-indigo-400";
    if (status === 'critical') iconColor = "text-rose-500 animate-pulse";
    else if (status === 'warning') iconColor = "text-amber-400";

    switch (type) {
      case "firewall":
        return (
          <g className={iconColor}>
            <rect x="-20" y="-20" width="40" height="40" rx="6" fill="#1e1b4b" stroke="currentColor" strokeWidth="2" />
            <path d="M-8 -6 L8 -6 M-8 0 L8 0 M-8 6 L8 6" stroke="currentColor" strokeWidth="2" />
            <path d="M0 -12 L0 12" stroke="currentColor" strokeWidth="1.5" />
          </g>
        );
      case "core": // routers
        return (
          <g className={iconColor}>
            <circle cx="0" cy="0" r="21" fill="#1e152a" stroke="currentColor" strokeWidth="2" />
            <path d="M-10 0 L10 0 M0 -10 L0 10" stroke="currentColor" strokeWidth="2" />
            <circle cx="0" cy="0" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </g>
        );
      case "distribution":
      case "edge": // switch
        return (
          <g className={iconColor}>
            <rect x="-21" y="-12" width="42" height="24" rx="4" fill="#0f172a" stroke="currentColor" strokeWidth="2" />
            <path d="M-12 -4 L12 -4 M-12 4 L12 4" stroke="#475569" strokeWidth="1" />
            <circle cx="-12" cy="0" r="1.5" fill="currentColor" />
            <circle cx="-6" cy="0" r="1.5" fill="currentColor" />
            <circle cx="0" cy="0" r="1.5" fill="currentColor" />
            <circle cx="6" cy="0" r="1.5" fill="currentColor" />
            <circle cx="12" cy="0" r="1.5" fill="currentColor" />
          </g>
        );
      case "server":
        return (
          <g className={iconColor}>
            <rect x="-16" y="-22" width="32" height="44" rx="3" fill="#0c101b" stroke="currentColor" strokeWidth="2" />
            <line x1="-10" y1="-10" x2="10" y2="-10" stroke="currentColor" strokeWidth="2" />
            <line x1="-10" y1="0" x2="10" y2="0" stroke="currentColor" strokeWidth="2" />
            <circle cx="-10" cy="12" r="2" fill="currentColor" />
            <circle cx="10" cy="12" r="2" fill="currentColor" />
          </g>
        );
      default:
        return (
          <circle cx="0" cy="0" r="15" fill="#334155" stroke="#cbd5e1" strokeWidth="2" />
        );
    }
  };

  const activeSelectedNode = nodes.find(n => n.id === selectedNodeId);
  const activeSelectedDevice = activeSelectedNode ? getDeviceForNode(activeSelectedNode) : null;

  return (
    <div className="space-y-6">
      {/* Topology Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0F1219] p-4 rounded-xl border border-slate-800 shadow-sm shadow-black/20">
        <div className="flex items-center gap-3">
          <Network className="h-6 w-6 text-indigo-400" />
          <div>
            <h2 className="text-base font-semibold text-white">Visual Network Topology</h2>
            <p className="text-xs text-slate-400">Interactive live schematic showing hardware nodes and interconnect transit wires.</p>
          </div>
        </div>

        {/* Filters and options */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Legend Layer Switch */}
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveLayer("all")}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold tracking-wider cursor-pointer transition-colors ${
                activeLayer === "all" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              ALL
            </button>
            <button
              onClick={() => setActiveLayer("core-infra")}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold tracking-wider cursor-pointer transition-colors ${
                activeLayer === "core-infra" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              CORE & FW
            </button>
            <button
              onClick={() => setActiveLayer("distribution")}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold tracking-wider cursor-pointer transition-colors ${
                activeLayer === "distribution" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              DIST
            </button>
            <button
              onClick={() => setActiveLayer("edge-access")}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold tracking-wider cursor-pointer transition-colors ${
                activeLayer === "edge-access" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              EDGE
            </button>
            <button
              onClick={() => setActiveLayer("servers")}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold tracking-wider cursor-pointer transition-colors ${
                activeLayer === "servers" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              SERVERS
            </button>
          </div>

          <button
            onClick={() => setIsZoomedIn(!isZoomedIn)}
            className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs px-3 py-2 rounded-lg border border-slate-700/60 font-medium cursor-pointer"
          >
            Zoom: {isZoomedIn ? "200% Focus" : "Standard Fit"}
          </button>
        </div>
      </div>

      {/* Map Layout view container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Topology map Canvas */}
        <div className="bg-slate-950 rounded-xl border border-slate-850 overflow-hidden lg:col-span-3 relative min-h-[500px] cyber-grid">
          {/* HUD Overlay Indicators */}
          <div className="absolute top-4 left-4 bg-slate-900/90 text-[10px] font-mono p-3 rounded border border-slate-800 space-y-1.5 z-10 text-slate-400 select-none">
            <span className="font-bold text-white block">LEGEND & STATUS</span>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded border border-emerald-950 bg-emerald-500"></span>
              <span>10G Link (Healthy)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded border border-amber-950 bg-amber-400"></span>
              <span>1G Link (Congested Trunk)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded border border-rose-950 bg-rose-500 animate-pulse"></span>
              <span>Route Interrupted (Downtime)</span>
            </div>
            <p className="text-[9px] text-indigo-400 mt-1.5 italic">💡 Drag nodes manually to re-shape layouts!</p>
          </div>

          {/* Canvas SVG */}
          <div className="w-full h-[550px] overflow-hidden">
            <svg
              ref={svgRef}
              className={`w-full h-full cursor-grab active:cursor-grabbing transition-transform duration-500`}
              style={{ transform: isZoomedIn ? "scale(1.2) translate(50px, 30px)" : "scale(1)" }}
              onMouseMove={handleSvgDragMove}
              onMouseUp={handleSvgDragEnd}
              onMouseLeave={handleSvgDragEnd}
            >
              {/* Draw Transit Wire paths */}
              {links.map((link) => {
                const srcCoord = getCoordinatesForNode(link.source);
                const destCoord = getCoordinatesForNode(link.target);
                
                // If either node is filtered out, optionally fade the link
                const isSrcVisible = filteredNodes.some(n => n.id === link.source);
                const isDestVisible = filteredNodes.some(n => n.id === link.target);
                const opacityPercent = isSrcVisible && isDestVisible ? 1 : 0.25;

                // Animate dash dot patterns on healthy links representing real packet flow
                const isDowntime = link.status === 'down';
                const isTrunkCongested = link.status === 'congested';

                return (
                  <g key={link.id} className="transition-all duration-300">
                    {/* Glowing background line */}
                    <line
                      x1={srcCoord.x}
                      y1={srcCoord.y}
                      x2={destCoord.x}
                      y2={destCoord.y}
                      stroke={getLinkColor(link.status)}
                      strokeWidth={isDowntime ? 4 : 2}
                      strokeOpacity={isDowntime ? 0.2 : 0.15}
                    />
                    
                    {/* Standard fiber line path */}
                    <line
                      x1={srcCoord.x}
                      y1={srcCoord.y}
                      x2={destCoord.x}
                      y2={destCoord.y}
                      stroke={getLinkColor(link.status)}
                      strokeWidth={isDowntime ? 2 : (isTrunkCongested ? 1.5 : 2)}
                      strokeOpacity={opacityPercent}
                      strokeDasharray={isDowntime ? "4,6" : (isTrunkCongested ? "6,6" : "none")}
                      className="transition-all"
                    />

                    {/* Animated moving dot on healthy traffic channels */}
                    {!isDowntime && !isTrunkCongested && opacityPercent === 1 && (
                      <circle r="4" fill="#67e8f9" filter="drop-shadow(0px 0px 3px #06b6d4)">
                        <animateMotion
                          path={`M ${srcCoord.x} ${srcCoord.y} L ${destCoord.x} ${destCoord.y}`}
                          dur={`${link.speed.includes("10 Gbps") ? "2s" : "4.5s"}`}
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}

                    {/* Speed indicator tooltip text */}
                    {isSrcVisible && isDestVisible && (
                      <text
                        x={(srcCoord.x + destCoord.x) / 2}
                        y={(srcCoord.y + destCoord.y) / 2 - 8}
                        fill="#64748b"
                        fontSize={8}
                        fontFamily="monospace"
                        textAnchor="middle"
                        className="select-none pointer-events-none"
                      >
                        {link.speed}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Draw Nodes */}
              {filteredNodes.map((node) => {
                const dev = getDeviceForNode(node);
                const status = dev?.status || "healthy";
                const isSelected = selectedNodeId === node.id;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    className="cursor-pointer transition-transform duration-100"
                    onMouseDown={(e) => handleNodeDragStart(e, node)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNodeId(node.id);
                    }}
                  >
                    {/* Ring selection indicator */}
                    {isSelected && (
                      <circle
                        cx="0"
                        cy="0"
                        r="32"
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="1.5"
                        strokeDasharray="4,4"
                        className="animate-spin"
                        style={{ transformOrigin: "0px 0px", animationDuration: "10s" }}
                      />
                    )}

                    {/* Node Glowing effect depending on health */}
                    {status === 'critical' && (
                      <circle cx="0" cy="0" r="24" fill="#ef4444" fillOpacity="0.15" className="animate-pulse" />
                    )}

                    {/* Retrieve matched vector design inside SVG */}
                    {getNodeSymbol(node.type, status)}

                    {/* Label Text Card backdrop */}
                    <rect
                      x="-65"
                      y="26"
                      width="130"
                      height="15"
                      rx="3"
                      fill="#0f172a"
                      fillOpacity="0.85"
                      stroke={isSelected ? "#6366f1" : "rgba(30, 41, 59, 1)"}
                      strokeWidth="1"
                    />

                    {/* Label text */}
                    <text
                      x="0"
                      y="37"
                      fill={status === 'critical' ? "#fca5a5" : "#f8fafc"}
                      fontSize={8}
                      fontWeight="bold"
                      fontFamily="sans-serif"
                      textAnchor="middle"
                      className="select-none"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Selected element details */}
        <div className="bg-[#0F1219] p-5 rounded-xl border border-slate-800 space-y-4 shadow-sm shadow-black/20 font-sans">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2.5">
            <Sliders className="h-4.5 w-4.5 text-indigo-400" />
            Device Node Details
          </h3>

          {activeSelectedNode && activeSelectedDevice ? (
            <div className="space-y-4 text-xs animate-fadeIn">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">NODE CLASS: {activeSelectedNode.type.toUpperCase()}</span>
                <h4 className="text-base font-bold text-white mt-0.5">{activeSelectedDevice.name}</h4>
                <p className="font-mono text-indigo-300 font-medium">{activeSelectedDevice.ip}</p>
              </div>

              <div className="space-y-3 bg-slate-950/70 p-3.5 rounded-lg border border-slate-850">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Device Status</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    activeSelectedDevice.status === 'healthy' ? 'text-emerald-400 bg-emerald-950/20' :
                    (activeSelectedDevice.status === 'warning' ? 'text-amber-400 bg-amber-950/20' : 'text-rose-400 bg-rose-950/20')
                  }`}>
                    {activeSelectedDevice.status}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Response Latency</span>
                  <span className="font-mono text-slate-200">{activeSelectedDevice.pingLatency} ms</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Packet Jitter Loss</span>
                  <span className="font-mono text-slate-200">{activeSelectedDevice.packetLoss}%</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">VLAN Division</span>
                  <span className="text-slate-300 font-medium truncate max-w-[120px]">{activeSelectedDevice.department}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2 pt-2">
                <div className="bg-slate-950/20 p-3 rounded border border-slate-900 text-slate-400 leading-normal text-[11px]">
                  <p><strong>Manual Drag enabled:</strong> Drag the node circle inside the canvas grid to rearrange coordinates across floors. Coordinates sync to persistent storage instantly.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-850 rounded-lg flex flex-col items-center justify-center gap-3">
              <Maximize2 className="h-8 w-8 text-slate-700" />
              <span>Click on any device node in the SVG diagram to open live metrics inspect tools, route bindings details, and fiber speeds.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
