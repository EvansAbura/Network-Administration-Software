/**
 * Type definitions for NOC Network Administration & Monitoring System
 */

export type DeviceType = 'router' | 'switch' | 'firewall' | 'server' | 'iot';

export interface DevicePort {
  number: number;
  status: 'up' | 'down';
  service: string;
}

export interface NetworkDevice {
  id: string;
  name: string;
  ip: string;
  type: DeviceType;
  status: 'healthy' | 'warning' | 'critical';
  department: string;
  snmpEnabled: boolean;
  snmpVersion: 'v2c' | 'v3';
  pingLatency: number; // Current latency in ms
  packetLoss: number; // Percentage
  cpuUsage: number; // Percentage
  ramUsage: number; // Percentage
  bandwidthIn: number; // Mbps inside/download
  bandwidthOut: number; // Mbps output/upload
  uptime: string;
  ports: DevicePort[];
  lastPolled: string;
}

export interface TopologyNode {
  id: string;
  label: string;
  type: 'core' | 'distribution' | 'edge' | 'server' | 'firewall';
  x: number;
  y: number;
  deviceId?: string;
}

export interface TopologyLink {
  id: string;
  source: string; // Node ID
  target: string; // Node ID
  speed: string; // e.g. "10 Gbps", "1 Gbps"
  status: 'up' | 'congested' | 'down';
}

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertType = 'downtime' | 'traffic' | 'security' | 'resource';

export interface NetworkAlert {
  id: string;
  timestamp: string;
  severity: AlertSeverity;
  source: string; // Device Name
  message: string;
  type: AlertType;
  acknowledged: boolean;
}

export type LogSeverity = 'EMERGENCY' | 'CRITICAL' | 'WARNING' | 'INFO' | 'DEBUG';
export type LogCategory = 'SYSTEM' | 'SECURITY' | 'TRAFFIC' | 'AUTH';

export interface SysLog {
  id: string;
  timestamp: string;
  severity: LogSeverity;
  category: LogCategory;
  device: string;
  ip: string;
  message: string;
}

export interface FirewallRule {
  id: string;
  priority: number;
  action: 'ALLOW' | 'DENY';
  protocol: 'TCP' | 'UDP' | 'ICMP' | 'ANY';
  sourceIp: string;
  destIp: string;
  port: string;
  name: string;
  enabled: boolean;
}

export type UserRole = 'Admin' | 'Network Engineer' | 'Viewer';

export interface UserSession {
  username: string;
  role: UserRole;
  token?: string;
}

export interface ThresholdConfig {
  cpuLimit: number; // e.g. 85
  ramLimit: number; // e.g. 90
  latencyLimit: number; // e.g. 150ms
  packetLossLimit: number; // e.g. 5%
  enableNotifications: boolean;
  emailRecipient: string;
  smsRecipient: string;
}
