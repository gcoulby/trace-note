import type { NodeType } from '../types';

export type SeedType =
  | 'domain' | 'ip' | 'email' | 'username'
  | 'person' | 'org' | 'phone' | 'hash' | 'url' | 'keyword';

export type ExecMode = 'api' | 'subprocess' | 'browser' | 'local';

export type ProviderCategory =
  | 'network' | 'domain' | 'person' | 'email'
  | 'social' | 'geo' | 'darkweb' | 'custom';

export type LogLevel = 'success' | 'error' | 'warn' | 'info';

export interface ProviderStats {
  requests: number;
  errors:   number;
  nodes:    number;
  edges:    number;
  lastRun:  number | null;  // unix ms
}

export interface OsintProvider {
  id:               string;
  templateId:       string | null;
  name:             string;
  category:         ProviderCategory;
  exec:             ExecMode;
  seeds:            SeedType[];
  endpoint:         string;
  apiKey:           string;
  rateLimit:        number | null;
  notes:            string;
  enabled:          boolean;
  confirmBeforeRun: boolean;
  stageResults:     boolean;
  stats:            ProviderStats;
  createdAt:        number;
}

export interface StagedNode {
  label:      string;
  nodeType:   NodeType;
  summary?:   string;
  properties: Record<string, string>;
  tags:       string[];
  confidence: 'low' | 'medium' | 'high';
}

export interface StagedEdge {
  sourceLabel: string;
  targetLabel: string;
  edgeLabel?:  string;
}

export interface StagedResult {
  id:           string;
  providerId:   string;
  providerName: string;
  seedValue:    string;
  seedType:     SeedType;
  nodes:        StagedNode[];
  edges:        StagedEdge[];
  createdAt:    number;
  approved:     boolean;
  dismissed:    boolean;
}

export interface ProviderLogEntry {
  id:           string;
  providerId:   string;
  providerName: string;
  level:        LogLevel;
  message:      string;
  meta: {
    nodes?:    number;
    edges?:    number;
    duration?: number;
    seed?:     string;
  };
  ts: number;
}

export interface ProviderTemplate {
  id:       string;
  name:     string;
  desc:     string;
  category: ProviderCategory;
  exec:     ExecMode;
  seeds:    SeedType[];
  endpoint: string;
}
