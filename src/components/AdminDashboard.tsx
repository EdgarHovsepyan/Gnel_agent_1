import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  ShieldCheck, 
  Activity, 
  Plus, 
  Search, 
  Settings, 
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  LogOut,
  LayoutDashboard,
  MessageSquare,
  BarChart3,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Organization, 
  AuditLog, 
  FeatureFlag, 
  UserRole, 
  UserStatus 
} from '../packages/foundation/types';
import { 
  AuthService, 
  OrgService, 
  AuditService, 
  FeatureFlagService 
} from '../packages/foundation/services';

interface AdminDashboardProps {
  currentUser: User;
  onLogout: () => void;
  onSwitchView: (view: 'landing' | 'chat' | 'dashboard' | 'admin') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  currentUser, 
  onLogout,
  onSwitchView
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'orgs' | 'logs' | 'flags'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // In a real app, we'd have list methods in services
        // For now, we'll simulate or use basic Firestore queries if available
        // Since we don't have list methods yet, let's just show the current user/org as a start
        setUsers([currentUser]);
        if (currentUser.organizationId) {
          const org = await OrgService.getOrganization(currentUser.organizationId);
          if (org) setOrgs([org]);
        }
        
        // Fetch logs
        if (currentUser.organizationId) {
          const auditLogs = await AuditService.getLogs(currentUser.organizationId);
          setLogs(auditLogs);
        }

        // Fetch flags
        if (currentUser.organizationId) {
          const featureFlags = await FeatureFlagService.getAllFlags(currentUser.organizationId);
          setFlags(featureFlags);
        }
      } catch (error) {
        console.error("Failed to fetch admin data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, activeTab]);

  const tabs = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'orgs', label: 'Organizations', icon: Building2 },
    { id: 'flags', label: 'Feature Flags', icon: ShieldCheck },
    { id: 'logs', label: 'Audit Logs', icon: Activity },
  ];

  return (
    <div className="flex h-screen bg-[#050505] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-black/50 backdrop-blur-xl flex flex-col">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-accent rounded-none flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase tracking-tighter italic">RevOS Admin</h1>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Foundation Layer</p>
            </div>
          </div>

          <nav className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-4 px-4">Management</p>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-none transition-all group ${
                  activeTab === tab.id ? 'bg-accent text-black' : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-black' : 'text-white/40 group-hover:text-white'}`} />
                <span className="text-xs font-black uppercase tracking-widest">{tab.label}</span>
              </button>
            ))}

            <div className="pt-8 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-4 px-4">Application</p>
              <button
                onClick={() => onSwitchView('landing')}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-none text-white/60 hover:bg-white/5 hover:text-white transition-all"
              >
                <LayoutDashboard className="w-5 h-5 text-white/40" />
                <span className="text-xs font-black uppercase tracking-widest">Main App</span>
              </button>
            </div>
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-white/5">
          <div className="flex items-center gap-4 mb-6">
            <img src={currentUser.photoURL || ''} className="w-10 h-10 rounded-none border border-white/10" alt="" />
            <div className="overflow-hidden">
              <p className="text-xs font-black uppercase tracking-tight truncate">{currentUser.displayName}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-widest truncate">{currentUser.role}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-3 py-3 border border-white/10 hover:border-red-500/50 hover:text-red-500 transition-all text-[10px] font-black uppercase tracking-widest"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 border-bottom border-white/5 px-12 flex items-center justify-between bg-black/20 backdrop-blur-md">
          <div className="flex items-center gap-8">
            <h2 className="text-2xl font-serif italic uppercase tracking-tighter">
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-none h-10 pl-12 pr-6 text-xs outline-none focus:border-accent transition-all w-64"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="h-10 px-6 bg-accent text-black text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-accent/80 transition-all">
              <Plus className="w-4 h-4" /> Create New
            </button>
            <button className="w-10 h-10 border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all">
              <Settings className="w-4 h-4 text-white/40" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'Total Users', value: users.length, icon: Users, color: 'text-blue-400' },
                  { label: 'Active Orgs', value: orgs.length, icon: Building2, color: 'text-purple-400' },
                  { label: 'System Health', value: '99.9%', icon: Activity, color: 'text-green-400' },
                  { label: 'Security Events', value: logs.length, icon: ShieldCheck, color: 'text-orange-400' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-none relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <stat.icon className="w-12 h-12" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">{stat.label}</p>
                    <p className={`text-3xl font-serif italic ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Data Table */}
              <div className="bg-white/5 border border-white/10 rounded-none overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-white/40">Details</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-white/40">Status</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-white/40">Role/Type</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-white/40">Last Activity</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-white/40 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTab === 'users' && users.map(user => (
                      <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-6">
                          <div className="flex items-center gap-4">
                            <img src={user.photoURL || ''} className="w-10 h-10 rounded-none border border-white/10" alt="" />
                            <div>
                              <p className="text-sm font-black uppercase tracking-tight">{user.displayName}</p>
                              <p className="text-xs text-white/40">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          <span className={`px-3 py-1 rounded-none text-[9px] font-black uppercase tracking-widest ${
                            user.status === UserStatus.ACTIVE ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                          }`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="p-6">
                          <span className="text-xs font-black uppercase tracking-widest text-white/60">{user.role}</span>
                        </td>
                        <td className="p-6">
                          <p className="text-xs text-white/40">{user.lastLoginAt?.toLocaleString() || 'Never'}</p>
                        </td>
                        <td className="p-6 text-right">
                          <button className="p-2 hover:bg-white/10 transition-all">
                            <MoreVertical className="w-4 h-4 text-white/40" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {activeTab === 'orgs' && orgs.map(org => (
                      <tr key={org.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-6">
                          <div>
                            <p className="text-sm font-black uppercase tracking-tight">{org.name}</p>
                            <p className="text-xs text-white/40">ID: {org.id}</p>
                          </div>
                        </td>
                        <td className="p-6">
                          <span className="px-3 py-1 rounded-none text-[9px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            ACTIVE
                          </span>
                        </td>
                        <td className="p-6">
                          <span className="text-xs font-black uppercase tracking-widest text-white/60">Enterprise</span>
                        </td>
                        <td className="p-6">
                          <p className="text-xs text-white/40">{org.createdAt.toLocaleDateString()}</p>
                        </td>
                        <td className="p-6 text-right">
                          <button className="p-2 hover:bg-white/10 transition-all">
                            <MoreVertical className="w-4 h-4 text-white/40" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {activeTab === 'flags' && flags.map(flag => (
                      <tr key={flag.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-6">
                          <div>
                            <p className="text-sm font-black uppercase tracking-tight">{flag.name}</p>
                            <p className="text-xs text-white/40">{flag.description}</p>
                          </div>
                        </td>
                        <td className="p-6">
                          <button 
                            className={`w-12 h-6 rounded-full transition-all relative ${flag.enabled ? 'bg-accent' : 'bg-white/10'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${flag.enabled ? 'left-7' : 'left-1'}`} />
                          </button>
                        </td>
                        <td className="p-6">
                          <span className="text-xs font-black uppercase tracking-widest text-white/60">Global</span>
                        </td>
                        <td className="p-6">
                          <p className="text-xs text-white/40">N/A</p>
                        </td>
                        <td className="p-6 text-right">
                          <button className="p-2 hover:bg-white/10 transition-all">
                            <MoreVertical className="w-4 h-4 text-white/40" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {activeTab === 'logs' && logs.map(log => (
                      <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-6">
                          <div>
                            <p className="text-sm font-black uppercase tracking-tight">{log.action}</p>
                            <p className="text-xs text-white/40">{log.resource}</p>
                          </div>
                        </td>
                        <td className="p-6">
                          <span className="px-3 py-1 rounded-none text-[9px] font-black uppercase tracking-widest bg-white/5 text-white/60 border border-white/10">
                            SUCCESS
                          </span>
                        </td>
                        <td className="p-6">
                          <span className="text-xs font-black uppercase tracking-widest text-white/60">{log.userId}</span>
                        </td>
                        <td className="p-6">
                          <p className="text-xs text-white/40">{log.timestamp.toLocaleString()}</p>
                        </td>
                        <td className="p-6 text-right">
                          <button className="p-2 hover:bg-white/10 transition-all">
                            <MoreVertical className="w-4 h-4 text-white/40" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
