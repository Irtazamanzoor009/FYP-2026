import React, { useEffect } from 'react';
import {
    Users,
    Shield,
    CheckCircle2,
    Loader2,
    Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import useTeamRolesStore from '../../store/teamRolesStore';

const ROLE_OPTIONS = [
    'Lead Developer',
    'Backend Engineer',
    'Frontend Developer',
    'Full Stack Developer',
    'QA Engineer',
    'DevOps Engineer',
    'Project Manager'
];

const ROLE_COLORS = {
    'Lead Developer': 'bg-purple-50 text-purple-600',
    'Backend Engineer': 'bg-blue-50 text-blue-600',
    'Frontend Developer': 'bg-pink-50 text-pink-600',
    'Full Stack Developer': 'bg-[#18bc9c]/10 text-[#18bc9c]',
    'QA Engineer': 'bg-yellow-50 text-yellow-600',
    'DevOps Engineer': 'bg-orange-50 text-orange-600',
    'Project Manager': 'bg-gray-100 text-gray-600'
};

const getInitials = (name) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

const TeamRoles = () => {
    const {
        teamMembers,
        rolesConfigured,
        isLoading,
        isSaving,
        fetchTeamRoles,
        updateMemberRole,
        saveTeamRoles
    } = useTeamRolesStore();

    useEffect(() => {
        fetchTeamRoles();
    }, []);

    const handleSave = async () => {
        const allAssigned = teamMembers.every(m => m.role);
        if (!allAssigned) {
            toast.error('Please assign a role to all team members');
            return;
        }
        const tid = toast.loading('Saving team roles...');
        const res = await saveTeamRoles();
        if (res.success) {
            toast.success('Team roles saved! AI suggestions will now be role-aware.', {
                id: tid,
                duration: 4000
            });
        } else {
            toast.error('Failed to save roles', { id: tid });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64 gap-3">
                <Loader2 size={24} className="animate-spin text-[#18bc9c]" />
                <span className="text-sm text-gray-500">Loading team members...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-12">

            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#2c3e50]">Team Roles Setup</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Assign roles so AI gives role-aware task reassignment suggestions.
                    </p>
                </div>
                {rolesConfigured && (
                    <div className="flex items-center gap-2 bg-[#18bc9c]/10 px-4 py-2 rounded-xl">
                        <CheckCircle2 size={16} className="text-[#18bc9c]" />
                        <span className="text-xs font-bold text-[#18bc9c]">
                            Roles Configured
                        </span>
                    </div>
                )}
            </header>

            {/* Info banner */}
            {!rolesConfigured && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                    <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-blue-700 mb-1">
                            One-time setup required
                        </p>
                        <p className="text-xs text-blue-600 leading-relaxed">
                            Assign roles to your team members below. The AI will use these
                            roles to suggest task reassignments only to people with the
                            right skills — for example, backend tasks will only be
                            reassigned to Backend Engineers or Full Stack Developers.
                        </p>
                    </div>
                </div>
            )}

            {/* Team members list */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
                    <Users size={16} className="text-[#2c3e50]" />
                    <h3 className="font-bold text-[#2c3e50]">
                        Team Members ({teamMembers.length})
                    </h3>
                </div>

                {teamMembers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Users size={32} className="text-gray-300" />
                        <p className="text-sm text-gray-500">No team members found</p>
                        <p className="text-xs text-gray-400">
                            Make sure your Jira workspace is connected
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {teamMembers.map((member) => (
                            <div
                                key={member.accountId}
                                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-5 hover:bg-gray-50/50 transition-colors"
                            >
                                {/* Member info */}
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-[#2c3e50] flex items-center justify-center font-bold text-white text-sm shrink-0">
                                        {getInitials(member.name)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-[#2c3e50]">
                                            {member.name}
                                        </p>
                                        <p className="text-[11px] text-gray-400">
                                            {member.email || 'No email'}
                                        </p>
                                        {member.skills?.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {member.skills.slice(0, 3).map(skill => (
                                                    <span
                                                        key={skill}
                                                        className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase"
                                                    >
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Role selector */}
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    {member.role && (
                                        <span className={`text-[10px] font-black px-3 py-1 rounded-full ${ROLE_COLORS[member.role] || 'bg-gray-100 text-gray-500'}`}>
                                            {member.role}
                                        </span>
                                    )}
                                    <select
                                        value={member.role || ''}
                                        onChange={(e) => updateMemberRole(member.accountId, e.target.value)}
                                        className="flex-1 sm:w-48 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-[#2c3e50] focus:ring-1 focus:ring-[#18bc9c] outline-none bg-white cursor-pointer"
                                    >
                                        <option value="">Select Role...</option>
                                        {ROLE_OPTIONS.map(role => (
                                            <option key={role} value={role}>{role}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Role Legend */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Shield size={16} className="text-[#2c3e50]" />
                    <h3 className="font-bold text-[#2c3e50] text-sm">Role Capabilities</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                        { role: 'Lead Developer', can: 'Backend, Frontend, API, Database' },
                        { role: 'Backend Engineer', can: 'Backend, API, Database' },
                        { role: 'Frontend Developer', can: 'Frontend, UI only' },
                        { role: 'Full Stack Developer', can: 'Backend, Frontend, API, UI' },
                        { role: 'QA Engineer', can: 'Testing, QA tasks only' },
                        { role: 'DevOps Engineer', can: 'DevOps, Backend tasks' }
                    ].map(item => (
                        <div
                            key={item.role}
                            className="p-3 rounded-xl bg-gray-50 border border-gray-100"
                        >
                            <p className={`text-[10px] font-black px-2 py-0.5 rounded-full inline-block mb-1 ${ROLE_COLORS[item.role] || 'bg-gray-100 text-gray-500'}`}>
                                {item.role}
                            </p>
                            <p className="text-[11px] text-gray-500">{item.can}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Save button */}
            {teamMembers.length > 0 && (
                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 bg-[#2c3e50] text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-[#18bc9c] transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isSaving
                            ? <><Loader2 size={16} className="animate-spin" /> Saving...</>
                            : <><CheckCircle2 size={16} /> Save Team Roles</>
                        }
                    </button>
                </div>
            )}
        </div>
    );
};

export default TeamRoles;