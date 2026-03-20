import {
  User, Building2, MapPin, CalendarDays, FileText,
  Car, Phone, Mail, Share2, Globe, Banknote, Laptop, Network,
} from 'lucide-react';
import type { NodeType } from '../types';

export interface NodeTypeConfig {
  label: string;
  icon: React.ReactNode;
  color: string;          // Tailwind text/bg classes for badge
  dot: string;            // CSS hex for sidebar dot
}

export const NODE_TYPE_CONFIG: Record<NodeType, NodeTypeConfig> = {
  person:    { label: 'Person',    icon: <User size={10} />,         color: 'text-blue-400 bg-blue-400/10 border-blue-400/30',     dot: '#60a5fa' },
  org:       { label: 'Org',       icon: <Building2 size={10} />,    color: 'text-purple-400 bg-purple-400/10 border-purple-400/30', dot: '#a78bfa' },
  location:  { label: 'Location',  icon: <MapPin size={10} />,       color: 'text-green-400 bg-green-400/10 border-green-400/30',  dot: '#4ade80' },
  event:     { label: 'Event',     icon: <CalendarDays size={10} />, color: 'text-amber-400 bg-amber-400/10 border-amber-400/30',  dot: '#fbbf24' },
  document:  { label: 'Document',  icon: <FileText size={10} />,     color: 'text-slate-400 bg-slate-400/10 border-slate-400/30',  dot: '#94a3b8' },
  vehicle:   { label: 'Vehicle',   icon: <Car size={10} />,          color: 'text-orange-400 bg-orange-400/10 border-orange-400/30', dot: '#fb923c' },
  phone:     { label: 'Phone',     icon: <Phone size={10} />,        color: 'text-teal-400 bg-teal-400/10 border-teal-400/30',     dot: '#2dd4bf' },
  email:     { label: 'Email',     icon: <Mail size={10} />,         color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',     dot: '#22d3ee' },
  social:    { label: 'Social',    icon: <Share2 size={10} />,       color: 'text-pink-400 bg-pink-400/10 border-pink-400/30',     dot: '#f472b6' },
  website:   { label: 'Website',   icon: <Globe size={10} />,        color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/30', dot: '#818cf8' },
  financial: { label: 'Financial', icon: <Banknote size={10} />,     color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30', dot: '#34d399' },
  device:    { label: 'Device',    icon: <Laptop size={10} />,       color: 'text-gray-400 bg-gray-400/10 border-gray-400/30',    dot: '#9ca3af' },
  ip:        { label: 'IP / Domain', icon: <Network size={10} />,   color: 'text-lime-400 bg-lime-400/10 border-lime-400/30',     dot: '#a3e635' },
};

export const ALL_NODE_TYPES = Object.keys(NODE_TYPE_CONFIG) as NodeType[];
