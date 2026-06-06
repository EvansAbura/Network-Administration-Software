import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { 
  NetworkDevice, 
  NetworkAlert, 
  SysLog, 
  FirewallRule, 
  ThresholdConfig, 
  UserRole,
  TopologyNode,
  TopologyLink,
  DeviceConfig,
  SNMPTrap,
  TrapOidMapping,
  AlertSeverity
} from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header requested in the system skill
const googleApiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (googleApiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey: googleApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini API Client initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize Gemini Client:", error);
  }
} else {
  console.log("GEMINI_API_KEY environment variable not found. Running with AI simulation Mode.");
}

// Global In-Memory Database (Seeded with realistic enterprise data)
let devices: NetworkDevice[] = [
  {
    id: "dev-1",
    name: "Edge-Firewall-Gwy",
    ip: "10.0.0.1",
    type: "firewall",
    status: "healthy",
    department: "Security Operations",
    snmpEnabled: true,
    snmpVersion: "v3",
    pingLatency: 4.2,
    packetLoss: 0,
    cpuUsage: 14,
    ramUsage: 28,
    bandwidthIn: 45.5,
    bandwidthOut: 38.2,
    uptime: "142d 08h 22m",
    ports: [
      { number: 80, status: "up", service: "HTTP Redirect" },
      { number: 443, status: "up", service: "Secure Gateway TLS" },
      { number: 22, status: "down", service: "SSH Mgmt" },
      { number: 161, status: "up", service: "SNMP Poll" }
    ],
    lastPolled: new Date().toISOString()
  },
  {
    id: "dev-2",
    name: "Core-Router-GW-01",
    ip: "10.0.0.254",
    type: "router",
    status: "healthy",
    department: "Core Network",
    snmpEnabled: true,
    snmpVersion: "v3",
    pingLatency: 1.5,
    packetLoss: 0,
    cpuUsage: 19,
    ramUsage: 35,
    bandwidthIn: 412.0,
    bandwidthOut: 395.4,
    uptime: "235d 14h 05m",
    ports: [
      { number: 179, status: "up", service: "BGP Routing" },
      { number: 161, status: "up", service: "SNMP agent" }
    ],
    lastPolled: new Date().toISOString()
  },
  {
    id: "dev-3",
    name: "Distribution-Switch-ZoneA",
    ip: "10.0.1.1",
    type: "switch",
    status: "healthy",
    department: "Engineering Infrastructure",
    snmpEnabled: true,
    snmpVersion: "v2c",
    pingLatency: 2.8,
    packetLoss: 0,
    cpuUsage: 22,
    ramUsage: 41,
    bandwidthIn: 185.3,
    bandwidthOut: 198.1,
    uptime: "56d 03h 11m",
    ports: [
      { number: 1, status: "up", service: "Uplink to Core" },
      { number: 2, status: "up", service: "Trunk Dist-Switch-ZoneB" },
      { number: 24, status: "down", service: "Spare Eth Port" }
    ],
    lastPolled: new Date().toISOString()
  },
  {
    id: "dev-4",
    name: "Edge-Switch-Floor1",
    ip: "10.0.2.1",
    type: "switch",
    status: "healthy",
    department: "Corporate IT",
    snmpEnabled: true,
    snmpVersion: "v2c",
    pingLatency: 5.4,
    packetLoss: 0.1,
    cpuUsage: 35,
    ramUsage: 50,
    bandwidthIn: 82.1,
    bandwidthOut: 64.9,
    uptime: "12d 19h 45m",
    ports: [
      { number: 1, status: "up", service: "Gigabit Link Distribution" }
    ],
    lastPolled: new Date().toISOString()
  },
  {
    id: "dev-5",
    name: "Edge-Switch-Floor2",
    ip: "10.0.2.2",
    type: "switch",
    status: "warning",
    department: "Corporate IT",
    snmpEnabled: true,
    snmpVersion: "v2c",
    pingLatency: 18.9,
    packetLoss: 1.5,
    cpuUsage: 74,
    ramUsage: 82,
    bandwidthIn: 98.4,
    bandwidthOut: 91.0,
    uptime: "12d 19h 44m",
    ports: [
      { number: 1, status: "up", service: "Gigabit Link Distribution" }
    ],
    lastPolled: new Date().toISOString()
  },
  {
    id: "dev-6",
    name: "IDM-ActiveDirectory-LDAP",
    ip: "10.0.1.10",
    type: "server",
    status: "healthy",
    department: "Systems & Security",
    snmpEnabled: true,
    snmpVersion: "v3",
    pingLatency: 1.1,
    packetLoss: 0,
    cpuUsage: 25,
    ramUsage: 55,
    bandwidthIn: 15.2,
    bandwidthOut: 12.8,
    uptime: "320d 11h 00m",
    ports: [
      { number: 389, status: "up", service: "LDAP Auth" },
      { number: 445, status: "up", service: "SMB Share" }
    ],
    lastPolled: new Date().toISOString()
  },
  {
    id: "dev-7",
    name: "AWS-Proxy-Sync-Server",
    ip: "10.0.1.20",
    type: "server",
    status: "healthy",
    department: "Systems & Security",
    snmpEnabled: false,
    snmpVersion: "v3",
    pingLatency: 35.6,
    packetLoss: 0,
    cpuUsage: 12,
    ramUsage: 45,
    bandwidthIn: 150.2,
    bandwidthOut: 240.4,
    uptime: "5d 01h 50m",
    ports: [
      { number: 8080, status: "up", service: "Sync Broker Proxy" }
    ],
    lastPolled: new Date().toISOString()
  },
  {
    id: "dev-8",
    name: "Postgres-DB-Cluster-Primary",
    ip: "10.0.1.30",
    type: "server",
    status: "critical",
    department: "Finance & Databases",
    snmpEnabled: true,
    snmpVersion: "v3",
    pingLatency: 124.5,
    packetLoss: 4.2,
    cpuUsage: 96,
    ramUsage: 94,
    bandwidthIn: 280.5,
    bandwidthOut: 340.2,
    uptime: "90d 05h 15m",
    ports: [
      { number: 5432, status: "up", service: "PostgreSQL Database Engine" }
    ],
    lastPolled: new Date().toISOString()
  },
  {
    id: "dev-9",
    name: "IoT-Thermostats-Bridges",
    ip: "10.0.2.100",
    type: "iot",
    status: "healthy",
    department: "Facilities & IoT",
    snmpEnabled: false,
    snmpVersion: "v2c",
    pingLatency: 12.2,
    packetLoss: 0.2,
    cpuUsage: 4,
    ramUsage: 18,
    bandwidthIn: 0.1,
    bandwidthOut: 0.2,
    uptime: "19d 12h 00m",
    ports: [
      { number: 1883, status: "up", service: "MQTT Bridge Queue" }
    ],
    lastPolled: new Date().toISOString()
  },
  {
    id: "dev-10",
    name: "Corporate-Badge-Readers",
    ip: "10.0.2.110",
    type: "iot",
    status: "healthy",
    department: "Facilities & IoT",
    snmpEnabled: false,
    snmpVersion: "v2c",
    pingLatency: 8.5,
    packetLoss: 0,
    cpuUsage: 8,
    ramUsage: 12,
    bandwidthIn: 0.4,
    bandwidthOut: 0.1,
    uptime: "45d 20h 10m",
    ports: [
      { number: 5001, status: "up", service: "Badge Scanner Payload" }
    ],
    lastPolled: new Date().toISOString()
  }
];

let topologyNodes: TopologyNode[] = [
  { id: "node-fw", label: "Edge-Firewall-Gwy", type: "firewall", x: 400, y: 50, deviceId: "dev-1" },
  { id: "node-core", label: "Core-Router-GW-01", type: "core", x: 400, y: 150, deviceId: "dev-2" },
  { id: "node-dist", label: "Dist-Switch-ZoneA", type: "distribution", x: 400, y: 260, deviceId: "dev-3" },
  { id: "node-edge1", label: "Edge-Switch-Floor1", type: "edge", x: 220, y: 380, deviceId: "dev-4" },
  { id: "node-edge2", label: "Edge-Switch-Floor2", type: "edge", x: 580, y: 380, deviceId: "dev-5" },
  { id: "node-server-ad", label: "ActiveDirectory", type: "server", x: 100, y: 260, deviceId: "dev-6" },
  { id: "node-server-proxy", label: "AWS-Proxy-Sync", type: "server", x: 100, y: 150, deviceId: "dev-7" },
  { id: "node-server-db", label: "Postgres-DB-Cluster", type: "server", x: 700, y: 260, deviceId: "dev-8" },
  { id: "node-iot-temp", label: "IoT-Thermostats", type: "server", x: 150, y: 480, deviceId: "dev-9" },
  { id: "node-iot-badge", label: "Badge-Readers", type: "server", x: 650, y: 480, deviceId: "dev-10" }
];

let topologyLinks: TopologyLink[] = [
  { id: "link-fw-core", source: "node-fw", target: "node-core", speed: "10 Gbps", status: "up" },
  { id: "link-core-dist", source: "node-core", target: "node-dist", speed: "10 Gbps", status: "up" },
  { id: "link-dist-edge1", source: "node-dist", target: "node-edge1", speed: "1 Gbps", status: "up" },
  { id: "link-dist-edge2", source: "node-dist", target: "node-edge2", speed: "1 Gbps", status: "congested" },
  { id: "link-core-proxy", source: "node-core", target: "node-server-proxy", speed: "1 Gbps", status: "up" },
  { id: "link-dist-ad", source: "node-dist", target: "node-server-ad", speed: "1 Gbps", status: "up" },
  { id: "link-dist-db", source: "node-dist", target: "node-server-db", speed: "10 Gbps", status: "down" }, // Link down representing DB issue
  { id: "link-edge1-iot-temp", source: "node-edge1", target: "node-iot-temp", speed: "100 Mbps", status: "up" },
  { id: "link-edge2-iot-badge", source: "node-edge2", target: "node-iot-badge", speed: "100 Mbps", status: "up" }
];

let alerts: NetworkAlert[] = [
  {
    id: "alert-1",
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    severity: "critical",
    source: "Postgres-DB-Cluster-Primary",
    message: "High response latency (124ms) combined with packet loss (4.2%) detected on database subnet interface.",
    type: "resource",
    acknowledged: false
  },
  {
    id: "alert-2",
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    severity: "medium",
    source: "Edge-Switch-Floor2",
    message: "Interface trunk port Gi0/1 CPU load exceeded Warning threshold of 70%. High traffic noise.",
    type: "traffic",
    acknowledged: false
  },
  {
    id: "alert-3",
    timestamp: new Date(Date.now() - 1200000).toISOString(),
    severity: "high",
    source: "Edge-Firewall-Gwy",
    message: "Unauthorized external login brute force scan block limit exceeded of 25 tries/min on SSH port 22.",
    type: "security",
    acknowledged: false
  }
];

let systemLogs: SysLog[] = [
  {
    id: "log-1",
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    severity: "INFO",
    category: "SYSTEM",
    device: "Core-Router-GW-01",
    ip: "10.0.0.254",
    message: "SNMP polling agent initialized successfully using community engine v3."
  },
  {
    id: "log-2",
    timestamp: new Date(Date.now() - 12000000).toISOString(),
    severity: "WARNING",
    category: "SYSTEM",
    device: "Edge-Switch-Floor2",
    ip: "10.0.2.2",
    message: "Spanning Tree Protocol (STP) topology change recalculation received on port FE0/4."
  },
  {
    id: "log-3",
    timestamp: new Date(Date.now() - 10000000).toISOString(),
    severity: "INFO",
    category: "TRAFFIC",
    device: "AWS-Proxy-Sync-Server",
    ip: "10.0.1.20",
    message: "Synchronized 4.2GB backup images incrementally to S3 Bucket us-east-1."
  },
  {
    id: "log-4",
    timestamp: new Date(Date.now() - 8000000).toISOString(),
    severity: "CRITICAL",
    category: "SYSTEM",
    device: "Postgres-DB-Cluster-Primary",
    ip: "10.0.1.30",
    message: "System out of virtual shared memory bounds. DB query buffer swap wait increased above acceptable 50ms standard limits."
  },
  {
    id: "log-5",
    timestamp: new Date(Date.now() - 4000000).toISOString(),
    severity: "CRITICAL",
    category: "SECURITY",
    device: "Edge-Firewall-Gwy",
    ip: "10.0.0.1",
    message: "IPS Alert: Blocked TCP SYN Flooding rogue attempt originating from external IP: 185.220.101.5."
  },
  {
    id: "log-6",
    timestamp: new Date(Date.now() - 2000000).toISOString(),
    severity: "INFO",
    category: "AUTH",
    device: "IDM-ActiveDirectory-LDAP",
    ip: "10.0.1.10",
    message: "LDAP Access GRANTED for administration account (evansabura1@gmail.com) from client node 10.0.2.45."
  }
];

let firewallRules: FirewallRule[] = [
  { id: "fw-r1", priority: 10, action: "ALLOW", protocol: "ANY", sourceIp: "10.0.1.0/24", destIp: "10.0.1.0/24", port: "ANY", name: "Internal Switch Interconnect Route", enabled: true },
  { id: "fw-r2", priority: 20, action: "ALLOW", protocol: "TCP", sourceIp: "ANY", destIp: "10.0.0.1", port: "443", name: "Allow Secure Administrative Access (HTTPS)", enabled: true },
  { id: "fw-r3", priority: 30, action: "DENY", protocol: "TCP", sourceIp: "ANY", destIp: "ANY", port: "22", name: "Restrict external SSH Administration", enabled: true },
  { id: "fw-r4", priority: 40, action: "ALLOW", protocol: "UDP", sourceIp: "10.0.0.0/16", destIp: "10.0.1.10", port: "389", name: "Authorize Network Active Directory LDAP queries", enabled: true },
  { id: "fw-r5", priority: 50, action: "DENY", protocol: "ANY", sourceIp: "185.220.101.0/24", destIp: "ANY", port: "ANY", name: "Block Tor Exit Nodes Blacklist", enabled: true }
];

let thresholdConfig: ThresholdConfig = {
  cpuLimit: 75,
  ramLimit: 80,
  latencyLimit: 100,
  packetLossLimit: 2.0,
  enableNotifications: true,
  emailRecipient: "evansabura1@gmail.com",
  smsRecipient: "+1 (555) 345-6789"
};

// Simple active session role
let adminRole: UserRole = "Admin";

// REAL-TIME METRIC SIMULATOR
// Shifts variables randomly every 5 seconds to generate live-looking graph updates, traffic anomalies, and alerts.
setInterval(() => {
  devices = devices.map(dev => {
    // Basic fluctuating variables
    let pingChange = (Math.random() - 0.5) * 1.5;
    let cpuChange = Math.floor((Math.random() - 0.5) * 8);
    let ramChange = Math.floor((Math.random() - 0.5) * 4);
    let bwChange = (Math.random() - 0.5) * 12;

    let nextLatency = Math.max(0.5, +(dev.pingLatency + pingChange).toFixed(2));
    let nextCpu = Math.max(2, Math.min(99, dev.cpuUsage + cpuChange));
    let nextRam = Math.max(5, Math.min(99, dev.ramUsage + ramChange));
    let nextBwIn = Math.max(0.1, +(dev.bandwidthIn + bwChange).toFixed(1));
    let nextBwOut = Math.max(0.1, +(dev.bandwidthOut + bwChange).toFixed(1));

    // Special behavior depending on custom status
    if (dev.id === "dev-8") { // DB Cluster representing issues unless rebooted/optimized
      nextLatency = Math.max(100, +(110 + (Math.random() - 0.5) * 20).toFixed(1));
      nextCpu = Math.max(90, Math.min(99, 94 + Math.floor(Math.random() * 5)));
      nextRam = Math.max(88, Math.min(98, 92 + Math.floor(Math.random() * 4)));
    }

    // Recalculate status based on current levels and configured thresholds
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (nextCpu > thresholdConfig.cpuLimit + 10 || nextLatency > thresholdConfig.latencyLimit + 50 || dev.packetLoss > thresholdConfig.packetLossLimit + 2) {
      status = 'critical';
    } else if (nextCpu > thresholdConfig.cpuLimit || nextLatency > thresholdConfig.latencyLimit || dev.packetLoss > thresholdConfig.packetLossLimit) {
      status = 'warning';
    }

    // Keep AWS server sync doing realistic bulk transfers
    if (dev.id === "dev-7") {
      nextBwIn = Math.max(120, +(140 + (Math.random() - 0.5) * 50).toFixed(1));
      nextBwOut = Math.max(200, +(220 + (Math.random() - 0.5) * 60).toFixed(1));
    }

    return {
      ...dev,
      pingLatency: nextLatency,
      cpuUsage: nextCpu,
      ramUsage: nextRam,
      bandwidthIn: nextBwIn,
      bandwidthOut: nextBwOut,
      status,
      lastPolled: new Date().toISOString()
    };
  });

  // Randomly generate traffic burst logging or suspicious access events
  if (Math.random() > 0.8) {
    const randomDev = devices[Math.floor(Math.random() * devices.length)];
    const id = "log-" + Date.now();
    const categories: ('SYSTEM' | 'SECURITY' | 'TRAFFIC')[] = ['SYSTEM', 'SECURITY', 'TRAFFIC'];
    const chosenCategory = categories[Math.floor(Math.random() * categories.length)];
    
    let message = `Automated SNMP check finalized successfully. Total interfaces analyzed: ${randomDev.ports.length}.`;
    let severity: ('INFO' | 'WARNING' | 'CRITICAL') = 'INFO';

    if (chosenCategory === 'TRAFFIC') {
      const activeFlow = Math.floor(Math.random() * 200 + 40);
      message = `High bandwidth session route triggered: ${activeFlow} Mbps mapped to LAN port Gi0/${Math.floor(Math.random() * randomDev.ports.length + 1)}`;
    } else if (chosenCategory === 'SECURITY') {
      const blockIp = `192.168.100.${Math.floor(Math.random() * 254 + 1)}`;
      message = `Firewall block filter: Portscan query detected from remote host ${blockIp} bound to subports. Event discarded.`;
      severity = 'WARNING';
    }

    const newLogItem: SysLog = {
      id,
      timestamp: new Date().toISOString(),
      severity,
      category: chosenCategory,
      device: randomDev.name,
      ip: randomDev.ip,
      message
    };

    systemLogs.unshift(newLogItem);
    if (systemLogs.length > 100) systemLogs.pop(); // limit size
  }

  // Check if warnings/critical issues should dynamically throw unresolved Alerts
  devices.forEach(dev => {
    if (dev.status === 'critical' && !alerts.some(a => a.source === dev.name && !a.acknowledged)) {
      const newAlert: NetworkAlert = {
        id: "alert-" + Date.now() + Math.floor(Math.random() * 100),
        timestamp: new Date().toISOString(),
        severity: "critical",
        source: dev.name,
        message: `High performance threshold breached: Critical node state triggered for ${dev.name}. Latency is ${dev.pingLatency}ms and CPU load is ${dev.cpuUsage}%.`,
        type: dev.type === 'firewall' ? 'security' : (dev.type === 'server' ? 'resource' : 'downtime'),
        acknowledged: false
      };
      alerts.unshift(newAlert);
      if (alerts.length > 100) alerts.pop();
    }
  });

  // Refresh links in topology corresponding to device health
  topologyLinks = topologyLinks.map(link => {
    const targetNode = topologyNodes.find(n => n.id === link.target);
    const sourceNode = topologyNodes.find(n => n.id === link.source);
    
    let status: 'up' | 'congested' | 'down' = 'up';
    if (targetNode?.deviceId) {
      const dev = devices.find(d => d.id === targetNode.deviceId);
      if (dev) {
        if (dev.status === 'critical') status = 'down';
        else if (dev.status === 'warning') status = 'congested';
      }
    }
    return { ...link, status };
  });

}, 5000);


// ==========================================
// CONFIGURATION MANAGEMENT DATA STRUCTURES
// ==========================================
let deviceConfigs: DeviceConfig[] = [
  {
    id: "cfg-1",
    deviceId: "dev-1",
    deviceName: "Edge-Firewall-Gwy",
    deviceIp: "10.0.0.1",
    version: 1,
    timestamp: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
    protocol: "SSH",
    content: `! Edge-Firewall-Gwy - Dynamic Backup Version 1
! Built: 2026-06-04T00:51:00Z
hostname Edge-Firewall-Gwy
!
interface GigabitEthernet0/0
 description WAN-Outside-Interface
 ip address 203.0.113.1 255.255.255.248
!
interface GigabitEthernet0/1
 description LAN-Inside-Interface
 ip address 10.0.0.1 255.255.255.0
!
access-list OUTSIDE-IN permit tcp any host 10.0.0.1 eq 443
access-list OUTSIDE-IN permit tcp any host 10.0.0.1 eq 80
access-list OUTSIDE-IN deny tcp any any eq 22
!
logging host 10.0.1.20`,
    backupBy: "Admin",
    comment: "Initial security baseline snapshot configuration",
    active: false
  },
  {
    id: "cfg-2",
    deviceId: "dev-1",
    deviceName: "Edge-Firewall-Gwy",
    deviceIp: "10.0.0.1",
    version: 2,
    timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    protocol: "SSH",
    content: `! Edge-Firewall-Gwy - Dynamic Backup Version 2
! Built: 2026-06-06T00:01:00Z
hostname Edge-Firewall-Gwy
!
interface GigabitEthernet0/0
 description WAN-Outside-Interface
 ip address 203.0.113.1 255.255.255.248
!
interface GigabitEthernet0/1
 description LAN-Inside-Interface
 ip address 10.0.0.1 255.255.255.0
!
! Update: Block malicious TOR IP Range
access-list OUTSIDE-IN deny tcp 185.220.101.0/24 any
access-list OUTSIDE-IN permit tcp any host 10.0.0.1 eq 443
access-list OUTSIDE-IN permit tcp any host 10.0.0.1 eq 80
access-list OUTSIDE-IN deny tcp any any eq 22
!
logging host 10.0.1.20`,
    backupBy: "Admin",
    comment: "Blocked rogue TOR relay 185.220.101.0/24 in access-list filter",
    active: true
  },
  {
    id: "cfg-3",
    deviceId: "dev-2",
    deviceName: "Core-Router-GW-01",
    deviceIp: "10.0.0.254",
    version: 1,
    timestamp: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    protocol: "SSH",
    content: `! Core-Router-GW-01 Configuration Version 1
hostname Core-Router-GW-01
!
router bgp 65001
 no synchronization
 bgp log-neighbor-changes
 neighbor 172.16.0.1 remote-as 65002
 neighbor 172.16.0.1 description Core ISP Transit Peer
 neighbor 192.168.10.1 remote-as 65001
 neighbor 192.168.10.1 description Backup Router Link
!
interface TenGigabitEthernet0/1
 description Trunk connection to Distribution switch Zone-A
 ip address 10.0.0.254 255.255.0.0
!
snmp-server community routingPublic RO 10
access-list 10 permit 10.0.0.0 0.0.255.255`,
    backupBy: "Network Engineer",
    comment: "BGP transit border configurations",
    active: true
  },
  {
    id: "cfg-4",
    deviceId: "dev-3",
    deviceName: "Distribution-Switch-ZoneA",
    deviceIp: "10.0.1.1",
    version: 1,
    timestamp: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    protocol: "TFTP",
    content: `! Distribution-Switch-ZoneA Configuration Version 1
hostname Distribution-Switch-ZoneA
!
vlan 10
 name Security-Ops
vlan 20
 name Engineering-Zone
vlan 30
 name Facilities-IoT
!
spanning-tree mode rapid-pvst
spanning-tree portfast defaults
!
interface GigabitEthernet0/1
 switchport mode trunk
!
snmp-server community private RW`,
    backupBy: "Admin",
    comment: "VLAN mapping and rapid-spanning tree configuration setup",
    active: true
  }
];

// ==========================================
// SNMP TRAP DATA STRUCTURES & MIB OIDS
// ==========================================
let receivedTraps: SNMPTrap[] = [
  {
    id: "trap-1",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    deviceId: "dev-2",
    deviceName: "Core-Router-GW-01",
    deviceIp: "10.0.0.254",
    severity: "medium",
    version: "v2c",
    enterpriseOid: "1.3.6.1.4.1.9.9.43.1.1.1",
    message: "SNMP Config change event: running config state modified by CLI session",
    parsedDescription: "CISCO-CONFIG-COPY-MIB: Config copy state modified. Indicates an administrator changed configuration via telnet/ssh."
  },
  {
    id: "trap-2",
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    deviceId: "dev-1",
    deviceName: "Edge-Firewall-Gwy",
    deviceIp: "10.0.0.1",
    severity: "critical",
    version: "v3",
    enterpriseOid: "1.3.6.1.6.3.1.1.5.3",
    message: "SNMP Trap: Link down event on WAN Port Gi0/0 (physical error detected)",
    parsedDescription: "IF-MIB: Link Down. Indicates a physical or logical link transition into down state."
  }
];

const TRAP_MAPPINGS: TrapOidMapping[] = [
  {
    oid: "1.3.6.1.6.3.1.1.5.3",
    name: "linkDown",
    description: "IF-MIB: Link Down trap. A physical port or logical trunk interface has transitioned into a down state.",
    defaultSeverity: "critical"
  },
  {
    oid: "1.3.6.1.6.3.1.1.5.4",
    name: "linkUp",
    description: "IF-MIB: Link Up trap. A previously degraded physical port has successfully re-established transport synchronizations.",
    defaultSeverity: "low"
  },
  {
    oid: "1.3.6.1.4.1.9.9.43.1.1.1",
    name: "ccCopyStateChange",
    description: "CISCO-CONFIG-COPY-MIB: Configuration State Copy completed. Signals a backup event or running-to-startup flash synchronization.",
    defaultSeverity: "medium"
  },
  {
    oid: "1.3.6.1.6.3.1.1.5.1",
    name: "coldStart",
    description: "SNMPv2-MIB: Cold Start. The network device core controller has reinitialized or rebooted completely due to a power loss cycle.",
    defaultSeverity: "critical"
  },
  {
    oid: "1.3.6.1.6.3.1.1.5.2",
    name: "warmStart",
    description: "SNMPv2-MIB: Warm Start. The network device has reloaded its software execution kernel while maintaining electrical and physical links.",
    defaultSeverity: "high"
  },
  {
    oid: "1.3.6.1.4.1.9.9.109.1.1.1",
    name: "ciscoCpuThresholdExceeded",
    description: "CISCO-PROCESS-MIB: CPU usage threshold exceeded limit. Hardware plane processing tasks are saturated, causing delayed packets routing.",
    defaultSeverity: "high"
  },
  {
    oid: "1.3.6.1.4.1.1991.1.1.2.1.2",
    name: "bgpPeerTransitFailure",
    description: "BGP4-MIB: BGP Peer Connection State Failure. Border Gateway Protocol peer routing adjacent connection has failed or lost BGP Keepalives.",
    defaultSeverity: "critical"
  },
  {
    oid: "1.3.6.1.4.1.9.9.41.1.2",
    name: "clogMessageGenerated",
    description: "CISCO-SYSLOG-MIB: Device internal syslog error generator. Emitted when critical buffer levels or cooling fan sensors fail.",
    defaultSeverity: "medium"
  }
];


// API ENDPOINTS

// 1. Role / JWT Mock Authentication Setup
app.get("/api/auth/session", (req, res) => {
  res.json({
    username: "evansabura1@gmail.com",
    role: adminRole
  });
});

app.post("/api/auth/role", (req, res) => {
  const { role } = req.body;
  if (role === 'Admin' || role === 'Network Engineer' || role === 'Viewer') {
    adminRole = role;
    
    // Log the change
    const newAuditLog: SysLog = {
      id: "log-audit-" + Date.now(),
      timestamp: new Date().toISOString(),
      severity: "WARNING",
      category: "AUTH",
      device: "Control-Gateway",
      ip: "127.0.0.1",
      message: `User role changed administratively to: ${role}`
    };
    systemLogs.unshift(newAuditLog);
    
    res.json({ status: "success", role: adminRole });
  } else {
    res.status(400).json({ error: "Invalid role value" });
  }
});

// 2. Devices APIs
app.get("/api/devices", (req, res) => {
  res.json(devices);
});

app.post("/api/devices", (req, res) => {
  if (adminRole === 'Viewer') {
    return res.status(403).json({ error: "Unauthorized. Viewers are in read-only mode." });
  }

  const { name, ip, type, department, snmpEnabled, snmpVersion } = req.body;
  
  if (!name || !ip || !type) {
    return res.status(400).json({ error: "Name, IP, and Type are required fields." });
  }

  const newDevice: NetworkDevice = {
    id: "dev-" + (devices.length + 1),
    name,
    ip,
    type,
    status: "healthy",
    department: department || "General Infrastructure",
    snmpEnabled: !!snmpEnabled,
    snmpVersion: snmpVersion || "v2c",
    pingLatency: +(Math.random() * 10 + 1).toFixed(1),
    packetLoss: 0,
    cpuUsage: Math.floor(Math.random() * 20 + 5),
    ramUsage: Math.floor(Math.random() * 30 + 10),
    bandwidthIn: 10.0,
    bandwidthOut: 8.0,
    uptime: "0d 00h 01m",
    ports: [
      { number: 80, status: "up", service: "HTTP Web Admin" },
      { number: 22, status: "up", service: "SSH Agent" }
    ],
    lastPolled: new Date().toISOString()
  };

  devices.push(newDevice);

  // Auto add to Topology Graph
  const newX = 200 + Math.floor(Math.random() * 400);
  const newY = 250 + Math.floor(Math.random() * 150);
  const node_id = "node-" + newDevice.id;
  
  topologyNodes.push({
    id: node_id,
    label: name,
    type: type === 'router' ? 'core' : (type === 'switch' ? 'edge' : 'server'),
    x: newX,
    y: newY,
    deviceId: newDevice.id
  });

  // Connect to core distribution node
  topologyLinks.push({
    id: "link-auto-" + newDevice.id,
    source: "node-dist",
    target: node_id,
    speed: "1 Gbps",
    status: "up"
  });

  // Append system audit logs
  systemLogs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    severity: "INFO",
    category: "SYSTEM",
    device: "Global NOC Console",
    ip: "127.0.0.1",
    message: `New network device registered successfully: ${name} [${ip}] classified as ${type}.`
  });

  res.status(201).json(newDevice);
});

app.put("/api/devices/:id", (req, res) => {
  if (adminRole === 'Viewer') {
    return res.status(403).json({ error: "Unauthorized. Viewers are in read-only mode." });
  }

  const { id } = req.params;
  const updateData = req.body;
  let devIndex = devices.findIndex(d => d.id === id);

  if (devIndex === -1) {
    return res.status(404).json({ error: "Device not found." });
  }

  devices[devIndex] = {
    ...devices[devIndex],
    ...updateData,
    lastPolled: new Date().toISOString()
  };

  res.json(devices[devIndex]);
});

app.delete("/api/devices/:id", (req, res) => {
  if (adminRole === 'Viewer') {
    return res.status(403).json({ error: "Unauthorized. Viewers are in read-only mode." });
  }

  const { id } = req.params;
  const devIndex = devices.findIndex(d => d.id === id);

  if (devIndex === -1) {
    return res.status(404).json({ error: "Device not found." });
  }

  const deletedDevName = devices[devIndex].name;
  devices.splice(devIndex, 1);

  // Remove corresponding node & links from topology
  const node_id = "node-" + id;
  topologyNodes = topologyNodes.filter(n => n.deviceId !== id);
  topologyLinks = topologyLinks.filter(l => l.source !== node_id && l.target !== node_id);

  systemLogs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    severity: "WARNING",
    category: "SYSTEM",
    device: "Global NOC Console",
    ip: "127.0.0.1",
    message: `Network monitor device unlinked and deleted: ${deletedDevName}.`
  });

  res.json({ status: "success", id });
});

// Device Troubleshoot: Reboot simulation
app.post("/api/devices/reboot/:id", (req, res) => {
  if (adminRole === 'Viewer') {
    return res.status(403).json({ error: "Unauthorized. Viewers are in read-only mode." });
  }

  const { id } = req.params;
  const dev = devices.find(d => d.id === id);

  if (!dev) {
    return res.status(404).json({ error: "Network element not found" });
  }

  // Restore metrics back to pristine healthy state and log it
  dev.status = "healthy";
  dev.cpuUsage = 15;
  dev.ramUsage = 25;
  dev.pingLatency = +(Math.random() * 4 + 1).toFixed(1);
  dev.packetLoss = 0;
  dev.uptime = "0d 00h 01m";

  // Resolve active alerts for this device
  alerts = alerts.map(a => {
    if (a.source === dev.name) {
      return { ...a, acknowledged: true };
    }
    return a;
  });

  // Log reboot action in Audit trail
  systemLogs.unshift({
    id: "log-reboot-" + Date.now(),
    timestamp: new Date().toISOString(),
    severity: "WARNING",
    category: "SYSTEM",
    device: dev.name,
    ip: dev.ip,
    message: `Hardware shell process signaled. Device hot-reload reboot requested by supervisor evansabura1@gmail.com.`
  });

  res.json({ status: "success", device: dev });
});

// Active PING CLI utility output sim
app.post("/api/devices/ping/:id", (req, res) => {
  const { id } = req.params;
  const dev = devices.find(d => d.id === id);

  if (!dev) {
    return res.status(404).json({ error: "Device target offline or invalid." });
  }

  // Generates genuine terminal text for the tool
  const datesStr = new Date().toUTCString();
  const lossCount = dev.status === 'critical' ? 2 : 0;
  const activeLatency = dev.pingLatency;

  const terminalOutput = `
PING ${dev.ip} (${dev.ip}) 56(84) bytes of data.
64 bytes from ${dev.ip}: icmp_seq=1 ttl=64 time=${activeLatency} ms
64 bytes from ${dev.ip}: icmp_seq=2 ttl=64 time=${(activeLatency + 0.52).toFixed(2)} ms
${lossCount > 0 ? 'Request timeout for icmp_seq=3' : `64 bytes from ${dev.ip}: icmp_seq=3 ttl=64 time=${(Math.abs(activeLatency - 0.41)).toFixed(2)} ms`}
64 bytes from ${dev.ip}: icmp_seq=4 ttl=64 time=${(activeLatency + 0.12).toFixed(2)} ms

--- ${dev.ip} ping statistics ---
4 packets transmitted, ${4 - lossCount} received, ${((lossCount/4)*100).toFixed(0)}% packet loss, time 3004ms
rtt min/avg/max/mdev = ${(activeLatency - 0.6).toFixed(3)}/${activeLatency.toFixed(3)}/${(activeLatency + 0.61).toFixed(3)}/0.412 ms
TRACEROUTE HOPS:
 1  gateway.local (10.0.0.254)  ${(activeLatency/3).toFixed(2)} ms
 2  ${dev.name} (${dev.ip})  ${activeLatency.toFixed(2)} ms
`;

  systemLogs.unshift({
    id: "log-ping-" + Date.now(),
    timestamp: new Date().toISOString(),
    severity: "INFO",
    category: "SYSTEM",
    device: "NOC-Console",
    ip: "127.0.0.1",
    message: `Triggered ICMP terminal ping check towards targeted Host: ${dev.name} [${dev.ip}].`
  });

  res.json({ output: terminalOutput });
});

// ARP / Nmap Network Auto-Discovery Subnet scan simulation
app.post("/api/devices/scan", (req, res) => {
  if (adminRole === 'Viewer') {
    return res.status(403).json({ error: "Viewer is restricted from issuing scans" });
  }

  const { subnet } = req.body || { subnet: "10.0.2.0/24" };
  
  // Discover 2 rogue devices that we append to our devices list
  const rogue1: NetworkDevice = {
    id: "dev-discovered-1",
    name: "Cisco-IP-Camera-Nursery",
    ip: "10.0.2.145",
    type: "iot",
    status: "healthy",
    department: "Sec-Audit / Discovery",
    snmpEnabled: false,
    snmpVersion: "v2c",
    pingLatency: 15.2,
    packetLoss: 0,
    cpuUsage: 8,
    ramUsage: 14,
    bandwidthIn: 4.8,
    bandwidthOut: 0.2,
    uptime: "2d 04h 12m",
    ports: [{ number: 554, status: "up", service: "RTSP Camera Feed" }],
    lastPolled: new Date().toISOString()
  };

  const rogue2: NetworkDevice = {
    id: "dev-discovered-2",
    name: "Unknown-Broadcom-Host",
    ip: "10.0.2.215",
    type: "iot",
    status: "warning",
    department: "Rogue-Audit / Discovery",
    snmpEnabled: false,
    snmpVersion: "v2c",
    pingLatency: 35.1,
    packetLoss: 1.2,
    cpuUsage: 22,
    ramUsage: 11,
    bandwidthIn: 18.5,
    bandwidthOut: 45.2,
    uptime: "0d 14h 55m",
    ports: [{ number: 8888, status: "up", service: "Unknown TCP Port" }],
    lastPolled: new Date().toISOString()
  };

  let newlyFound: NetworkDevice[] = [];
  if (!devices.some(d => d.id === "dev-discovered-1")) {
    devices.push(rogue1);
    newlyFound.push(rogue1);

    // Map rogue 1
    topologyNodes.push({
      id: "node-discovered-1",
      label: "Cisco-IP-Camera-Nursery",
      type: "edge",
      x: 300,
      y: 450,
      deviceId: "dev-discovered-1"
    });
    topologyLinks.push({
      id: "link-disc-1",
      source: "node-edge1",
      target: "node-discovered-1",
      speed: "100 Mbps",
      status: "up"
    });
  }

  if (!devices.some(d => d.id === "dev-discovered-2")) {
    devices.push(rogue2);
    newlyFound.push(rogue2);

    // Map rogue 2
    topologyNodes.push({
      id: "node-discovered-2",
      label: "Unknown-Broadcom-Host",
      type: "edge",
      x: 500,
      y: 450,
      deviceId: "dev-discovered-2"
    });
    topologyLinks.push({
      id: "link-disc-2",
      source: "node-edge2",
      target: "node-discovered-2",
      speed: "100 Mbps",
      status: "up"
    });
  }

  // Create alert for Rogue device discovery if rogue matches unknown type
  if (newlyFound.length > 0) {
    alerts.unshift({
      id: "alert-discovered-" + Date.now(),
      timestamp: new Date().toISOString(),
      severity: "medium",
      source: "NOC Discovery Engine",
      message: `Rogue connection sweep complete: Discovered unregistered Broadcom Host on address 10.0.2.215. Review authorization profiles immediately.`,
      type: "security",
      acknowledged: false
    });
  }

  systemLogs.unshift({
    id: "log-sweep-" + Date.now(),
    timestamp: new Date().toISOString(),
    severity: "WARNING",
    category: "SECURITY",
    device: "Discovery Sweeper",
    ip: "10.0.2.1",
    message: `Completed rapid Nmap/ARP scan over subnets block: ${subnet}. Discovered ${newlyFound.length} responsive peripheral hosts.`
  });

  res.json({
    status: "success",
    discoveredCount: newlyFound.length,
    scannedSubnet: subnet,
    devices: newlyFound
  });
});

// 3. Topology Layout Coordinator APIS
app.get("/api/topology", (req, res) => {
  res.json({ nodes: topologyNodes, links: topologyLinks });
});

app.put("/api/topology/node/:id", (req, res) => {
  const { id } = req.params;
  const { x, y } = req.body;
  const node = topologyNodes.find(n => n.id === id);
  if (node) {
    node.x = x;
    node.y = y;
    res.json(node);
  } else {
    res.status(404).json({ error: "Node layout element not found" });
  }
});

// 4. Alerts
app.get("/api/alerts", (req, res) => {
  res.json(alerts);
});

app.post("/api/alerts/acknowledge", (req, res) => {
  if (adminRole === 'Viewer') {
    return res.status(403).json({ error: "Viewer is unauthorized to alter state" });
  }

  const { id } = req.body;
  const alert = alerts.find(a => a.id === id);
  if (alert) {
    alert.acknowledged = true;
    res.json({ status: "success", alert });
  } else {
    res.status(404).json({ error: "Alert index not found" });
  }
});

app.post("/api/alerts/clear", (req, res) => {
  if (adminRole === 'Viewer') {
    return res.status(403).json({ error: "Viewer is unauthorized" });
  }

  alerts = alerts.filter(a => !a.acknowledged);
  res.json({ status: "success", remaining: alerts.length });
});

// 5. Firewalls Rules APIS
app.get("/api/firewall", (req, res) => {
  res.json(firewallRules);
});

app.post("/api/firewall", (req, res) => {
  if (adminRole === 'Viewer') {
    return res.status(403).json({ error: "Viewers cannot configure rules." });
  }

  const { name, action, protocol, sourceIp, destIp, port, priority } = req.body;
  
  if (!name || !action || !protocol || !sourceIp || !destIp || !port || !priority) {
    return res.status(400).json({ error: "All firewall rule fields are required." });
  }

  const newRule: FirewallRule = {
    id: "fw-r" + (firewallRules.length + 1),
    priority: +priority,
    action,
    protocol,
    sourceIp,
    destIp,
    port,
    name,
    enabled: true
  };

  firewallRules.push(newRule);
  firewallRules.sort((a,b) => a.priority - b.priority);

  // audit trail
  systemLogs.unshift({
    id: "log-fw-" + Date.now(),
    timestamp: new Date().toISOString(),
    severity: "WARNING",
    category: "SECURITY",
    device: "Edge-Firewall-Gwy",
    ip: "10.0.0.1",
    message: `Firewall Policy Updated: Inserted priority rule ${priority} (${action}) for packets matching ${protocol} from ${sourceIp} to ${destIp}:${port}.`
  });

  res.status(201).json(newRule);
});

app.put("/api/firewall/:id", (req, res) => {
  if (adminRole === 'Viewer') {
    return res.status(403).json({ error: "Viewer is restricted from altering rules" });
  }

  const { id } = req.params;
  const { enabled } = req.body;
  
  const rule = firewallRules.find(r => r.id === id);
  if (rule) {
    rule.enabled = enabled;
    
    systemLogs.unshift({
      id: "log-fw-" + Date.now(),
      timestamp: new Date().toISOString(),
      severity: "WARNING",
      category: "SECURITY",
      device: "Edge-Firewall-Gwy",
      ip: "10.0.0.1",
      message: `Firewall Policy Altered: Rule ID ${id} [${rule.name}] was ${enabled ? 'ENABLED' : 'DISABLED'} by engineer evansabura1@gmail.com.`
    });
    res.json(rule);
  } else {
    res.status(404).json({ error: "Rule not found" });
  }
});

// 6. Thresholds APIS
app.get("/api/thresholds", (req, res) => {
  res.json(thresholdConfig);
});

app.put("/api/thresholds", (req, res) => {
  if (adminRole === 'Viewer') {
    return res.status(403).json({ error: "Viewer cannot configure thresholds." });
  }

  thresholdConfig = {
    ...thresholdConfig,
    ...req.body
  };
  
  res.json(thresholdConfig);
});

// 7. System & Event Logs APIS
app.get("/api/logs", (req, res) => {
  res.json(systemLogs);
});

// Exports report CSV sheets instantly
app.get("/api/logs/export", (req, res) => {
  let csvContent = "Timestamp,Severity,Category,Device,IP,Message\n";
  systemLogs.forEach(entry => {
    csvContent += `"${entry.timestamp}","${entry.severity}","${entry.category}","${entry.device}","${entry.ip}","${entry.message.replace(/"/g, '""')}"\n`;
  });
  
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=noc_audit_logs.csv");
  res.send(csvContent);
});


// ==========================================
// CONFIGURATION MANAGEMENT APIS
// ==========================================
app.get("/api/configs", (req, res) => {
  res.json(deviceConfigs);
});

app.post("/api/configs/backup", (req, res) => {
  if (adminRole === 'Viewer') {
    return res.status(403).json({ error: "Unauthorized. Viewers cannot trigger config backups." });
  }

  const { deviceId, protocol, comment } = req.body;
  if (!deviceId || !protocol) {
    return res.status(400).json({ error: "Device ID and backup protocol are required." });
  }

  const device = devices.find(d => d.id === deviceId);
  if (!device) {
    return res.status(404).json({ error: "Device not found." });
  }

  // Calculate new design version
  const prevConfigs = deviceConfigs.filter(c => c.deviceId === deviceId);
  const nextVer = prevConfigs.length > 0 ? Math.max(...prevConfigs.map(c => c.version)) + 1 : 1;

  // Build simulated Cisco IOS or Juniper config file based on device details
  const configContent = `! ${device.name} Running Configuration Dump
! Version ${nextVer} - Backup retrieved via ${protocol}
! Timestamp: ${new Date().toISOString()}
hostname ${device.name}
!
interface GigabitEthernet0/1
 description Inbound interface for ${device.department}
 ip address ${device.ip} 255.255.255.0
 speed auto
 duplex auto
!
${device.type === 'firewall' ? 'security-policy zone inside\nsecurity-policy zone outside\nsecurity-policy rulepermit port 443\nsecurity-policy rulepermit port 80\nsecurity-policy rulestop ssh' : ''}
${device.type === 'router' ? 'router ospf 100\n network 10.0.0.0 0.255.255.255 area 0\n redistribute connected subnets' : ''}
${device.type === 'switch' ? 'vlan 10,20,30,40\nspanning-tree mode rapid-pvst\nspanning-tree portfast default' : ''}
${device.type === 'server' ? 'service snmpd restart\nservice packet_analyzer listen all\nports [80, 443, 8080]' : ''}
!
! Performance parameters on backup: CPU Load ${device.cpuUsage}%, RAM Usage ${device.ramUsage}%
! SNMP Version enabled: ${device.snmpEnabled ? device.snmpVersion : 'none'}
! End of configuration backup file.`;

  // Deactivate other backups of the same device
  deviceConfigs = deviceConfigs.map(c => c.deviceId === deviceId ? { ...c, active: false } : c);

  const newConfig: DeviceConfig = {
    id: "cfg-" + Date.now(),
    deviceId,
    deviceName: device.name,
    deviceIp: device.ip,
    version: nextVer,
    timestamp: new Date().toISOString(),
    protocol,
    content: configContent,
    backupBy: adminRole,
    comment: comment || `On-demand telemetry config backup via ${protocol}.`,
    active: true
  };

  deviceConfigs.unshift(newConfig);

  // Add system log
  systemLogs.unshift({
    id: "log-backup-event-" + Date.now(),
    timestamp: new Date().toISOString(),
    severity: "INFO",
    category: "SYSTEM",
    device: device.name,
    ip: device.ip,
    message: `Configuration backup process succeeded. Retrieved local backup version ${nextVer} via protocol ${protocol} and saved to database.`
  });

  res.json(newConfig);
});

app.post("/api/configs/deploy", (req, res) => {
  if (adminRole === 'Viewer') {
    return res.status(403).json({ error: "Unauthorized. Viewers are in read-only mode." });
  }

  const { deviceId, content, comment } = req.body;
  if (!deviceId || !content) {
    return res.status(400).json({ error: "Device ID and configuration template body are required." });
  }

  const device = devices.find(d => d.id === deviceId);
  if (!device) {
    return res.status(404).json({ error: "Target network device not found." });
  }

  const prevConfigs = deviceConfigs.filter(c => c.deviceId === deviceId);
  const nextVer = prevConfigs.length > 0 ? Math.max(...prevConfigs.map(c => c.version)) + 1 : 1;

  // Set other configs to inactive
  deviceConfigs = deviceConfigs.map(c => c.deviceId === deviceId ? { ...c, active: false } : c);

  const newConfig: DeviceConfig = {
    id: "cfg-" + Date.now(),
    deviceId,
    deviceName: device.name,
    deviceIp: device.ip,
    version: nextVer,
    timestamp: new Date().toISOString(),
    protocol: "SSH",
    content: content,
    backupBy: adminRole,
    comment: comment || `Administrative configuration deployment.`,
    active: true
  };

  deviceConfigs.unshift(newConfig);

  // Add severe syslog to state device modifications
  systemLogs.unshift({
    id: "log-deploy-event-" + Date.now(),
    timestamp: new Date().toISOString(),
    severity: "WARNING",
    category: "SYSTEM",
    device: device.name,
    ip: device.ip,
    message: `Deploy configuration change target succeeded. Set config version ${nextVer} active. Physical interfaces re-scanning.`
  });

  res.json({ status: "success", config: newConfig });
});


// ==========================================
// SNMP TRAPS & ALERTS MAPPING APIS
// ==========================================
app.get("/api/snmp/traps", (req, res) => {
  res.json(receivedTraps);
});

app.get("/api/snmp/mappings", (req, res) => {
  res.json(TRAP_MAPPINGS);
});

app.post("/api/snmp/traps/trigger", (req, res) => {
  if (adminRole === 'Viewer') {
    return res.status(403).json({ error: "Viewer role are forbidden from triggering SNMP traps." });
  }

  const { deviceId, deviceIp, oid, message, version } = req.body;
  if (!oid) {
    return res.status(400).json({ error: "SNMP Trap enterprise OID identifier is required." });
  }

  let mappedDevice = devices.find(d => d.id === deviceId || d.ip === deviceIp);
  const ip = mappedDevice ? mappedDevice.ip : (deviceIp || "10.0.99.99");
  const name = mappedDevice ? mappedDevice.name : `Unregistered-Node`;

  const mapping = TRAP_MAPPINGS.find(m => m.oid === oid) || {
    name: "genericEnterpriseTrap",
    description: "Enterprise OID mapping unidentified in general MIB library.",
    defaultSeverity: "medium" as AlertSeverity
  };

  const trapMsg = message || `SNMP trap received: trigger condition met. Enterprise OID: ${oid}`;
  const trapId = "trap-" + Date.now();
  
  const newTrap: SNMPTrap = {
    id: trapId,
    timestamp: new Date().toISOString(),
    deviceId: mappedDevice ? mappedDevice.id : undefined,
    deviceIp: ip,
    deviceName: name,
    severity: mapping.defaultSeverity,
    version: version || "v2c",
    enterpriseOid: oid,
    message: trapMsg,
    parsedDescription: mapping.description
  };

  receivedTraps.unshift(newTrap);

  // Create corresponding alert in Alerting & Notification System
  const alertId = "alert-trap-" + Date.now();
  const trapAlert: NetworkAlert = {
    id: alertId,
    timestamp: new Date().toISOString(),
    severity: mapping.defaultSeverity,
    source: name,
    message: `[SNMP-TRAP ${version.toUpperCase()}] Event OID: ${mapping.name}. Details: ${trapMsg}. Mapped Definition: ${mapping.description}`,
    type: mapping.defaultSeverity === "critical" ? "downtime" : (mapping.defaultSeverity === "high" ? "security" : "resource"),
    acknowledged: false
  };
  alerts.unshift(trapAlert);

  // Inject Syslog entry as well
  systemLogs.unshift({
    id: "log-trap-" + Date.now(),
    timestamp: new Date().toISOString(),
    severity: mapping.defaultSeverity === "critical" ? "CRITICAL" : (mapping.defaultSeverity === "high" ? "WARNING" : "INFO"),
    category: "SYSTEM",
    device: name,
    ip,
    message: `[SNMP-TRAP-${version.toUpperCase()} RECEIVED] OID: ${oid} (${mapping.name}). Description: ${mapping.description}. Payload: ${trapMsg}`
  });

  res.json({ status: "success", trap: newTrap, alert: trapAlert });
});


// 8. GEMINI AI SECURE SERVICE HANDLERS

// A. AI QoS optimization suggestions
app.post("/api/gemini/optimize", async (req, res) => {
  // If API key is missing, return a smart, formatted expert mock response
  if (!ai) {
    const backupRecommendation = `
### 🛰️ Gemini network Optimizer Summary
*No GEMINI_API_KEY detected in Secrets panel. Serving optimized localized analysis for current topology:*

1. **DB Segment Bottleneck**:
   - Primary DB database (IP: \`10.0.1.30\`) is currently under heavy traffic loading representing congested links (current state *CRITICAL*).
   - **Recommendation**: Map out the trunk interface. Deploy high-capacity QoS queuing (Strict Priority queuing) favoring DB query connections on Port \`5432\`.

2. **Floor 2 Congestion (Switch-Floor2)**:
   - High local switches telemetry (CPU: \`74%\`, Jitter alerts).
   - **Recommendation**: Deploy active IGMP Snooping on \`Dist-Switch-ZoneA\` to dump multi-cast badges/IoT discovery loops from flooding VLAN broadcast domains.
   
3. **Audit policy recommendations**:
   - Establish traffic-shaping rate buffers (max 150Mbps allocation limits) targeting AWS cloud Proxies (\`10.0.1.20\`) during standard corporate shift window intervals.
`;
    return res.json({ analysis: backupRecommendation });
  }

  try {
    const systemPrompt = `You are an elite, principal CCNP/CCIE enterprise network architecture advisor. Analyze the provided network parameters, active devices, and topology links. Provide structured, authoritative solutions on how to optimize QoS, route parameters, resolve congestions, and maintain solid security policies. Keep the formatting in clear, scannable markdown with bold labels and lists. Keep the response to 400 words max.`;
    
    const formattedDeviceTelemetryData = devices.map(d => 
      `Name: ${d.name}, Type: ${d.type}, IP: ${d.ip}, Status: ${d.status}, Latency: ${d.pingLatency}ms, Loss: ${d.packetLoss}%, CPU: ${d.cpuUsage}%, RAM: ${d.ramUsage}%, BandwidthIn: ${d.bandwidthIn}Mbps, BandwidthOut: ${d.bandwidthOut}Mbps`
    ).join("\n");

    const userPrompt = `Analyze this active enterprise network config and recommend optimizations:
--- TELEMETRY READINGS ---
${formattedDeviceTelemetryData}

--- TOPOLOGY PATH LINKS ---
${topologyLinks.map(l => `${l.source} connects to ${l.target} (Speed: ${l.speed}, Link State: ${l.status})`).join("\n")}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2
      }
    });

    res.json({ analysis: response.text });
  } catch (err: any) {
    console.error("Gemini API Error:", err);
    res.status(500).json({ error: "Failed to query Gemini AI engine.", details: err.message });
  }
});

// B. Anomaly & Network Predictive Anomaly AI Engine
app.post("/api/gemini/predict", async (req, res) => {
  if (!ai) {
    const backupAnomalyAnalysis = `
### 🧠 Anomaly & Network Predictive Failure Engine
*No GEMINI_API_KEY found in setup. Serving offline predictive analytics:*

1. **Switch-Floor2 Latency Spike Trend**:
   - **Anomaly Score**: **82%**
   - **Trend**: Telemetry indicates a linear load climb over the past hours (CPU: 74%, memory load high).
   - **Failure Point Prediction**: High risk of Spanning Tree Protocol loop within the next **4-6 hours** if IoT facilities keep scanning sub-VLANs.
   - **Remedy**: Temporarily disable the Rogue broadcom node \`10.0.2.215\` or rate limit the port on Edge-Switch-Floor2.

2. **Syslog IPS Flooding Alert**:
   - **Anomaly Score**: **95%**
   - **Risk Zone**: Edge gateway SSH/Port scans from IP \`185.220.101.5\`.
   - **Failure Point Prediction**: Possible administrative access lockout or authentication credential degradation under constant brute force stress.
   - **Remedy**: Rule ID \`fw-r3\` is denied but firewall logs show attempts. Check if Tor relay blacklists need updating.
`;
    return res.json({ analysis: backupAnomalyAnalysis });
  }

  try {
    const systemPrompt = `You are an AI NetOps Anomaly & Predictive Diagnostics bot. Analyze recent syslogs and active warning states. Quantify anomaly scores in percentages (e.g., 85%), predict failure risks over a timeline, and write specific diagnostic correction guides. Use precise markdown elements. Keep the response concise, scannable, and extremely professional.`;
    
    const serializedIssues = systemLogs.slice(0, 15).map(l => 
      `[${l.timestamp}] Device: ${l.device} (${l.ip}) - Severe: ${l.severity} - Cat: ${l.category} - Msg: ${l.message}`
    ).join("\n");

    const userPrompt = `Inspect these recent active syslogs and device alarms for anomalies:
--- RECENT LOG FILES ---
${serializedIssues}

--- ACTIVE DEVICE BREACHES ---
${devices.filter(d => d.status !== 'healthy').map(d => `${d.name}: CPU ${d.cpuUsage}%, Ping Latency ${d.pingLatency}ms, packet loss ${d.packetLoss}%`).join("\n")}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.15
      }
    });

    res.json({ analysis: response.text });
  } catch (err: any) {
    console.error("Gemini Failure Analysis API Error:", err);
    res.status(500).json({ error: "AI Prediction analysis service error.", details: err.message });
  }
});


// FRONTEND VITE INTEGRATION BINDINGS

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Mount Vite middleware in development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Mounted Vite Dev Server Middleware.");
  } else {
    // Static distribution hosting configuration in production runs
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Serving static production files from:", distPath);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`============================================`);
    console.log(` NOC MONITORING SYSTEM IS ONLINE AND READY  `);
    console.log(` Listening on: http://0.0.0.0:${PORT}       `);
    console.log(`============================================`);
  });
}

startServer();
