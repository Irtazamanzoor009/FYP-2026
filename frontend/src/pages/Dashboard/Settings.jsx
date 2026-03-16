import React, { useRef, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Camera, Lock, ShieldCheck, CheckCircle2, KeyRound, Eye, EyeOff } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import Loader from '../../components/Loader';

const Settings = () => {
    const { user, updateProfile, uploadAvatar, changePassword, setPassword, isLoading } = useAuthStore();
    const fileInputRef = useRef(null);
    const [showPass, setShowPass] = useState({ old: false, new: false, set: false });

    const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

    // Profile Name Form
    const nameForm = useFormik({
        initialValues: { name: user?.name || '' },
        enableReinitialize: true,
        validationSchema: Yup.object({ name: Yup.string().required('Required') }),
        onSubmit: async (values) => {
            const res = await updateProfile(values);
            if (res.success) toast.success("Name updated successfully");
            else toast.error(res.message);
        }
    });

    // Password Update Form
    const passForm = useFormik({
        initialValues: { oldPassword: '', newPassword: '' },
        validationSchema: Yup.object({
            oldPassword: Yup.string().required('Current password required'),
            newPassword: Yup.string().min(6, 'Min 6 chars').required('New password required'),
        }),
        onSubmit: async (values, { resetForm }) => {
            const res = await changePassword(values);
            if (res.success) {
                toast.success("Password changed!");
                resetForm();
            } else toast.error(res.message);
        }
    });

    // Handle Image Selection
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const tid = toast.loading("Uploading image...");
            const res = await uploadAvatar(file);
            if (res.success) toast.success("Photo updated!", { id: tid });
            else toast.error("Upload failed", { id: tid });
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 px-4">
            <header>
                <h1 className="text-2xl font-bold text-[#2c3e50]">Account Settings</h1>
                <p className="text-sm text-gray-500">Update your project manager identity and security.</p>
            </header>

            {/* 1. PROFILE SECTION */}
            <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-10">
                <div className="flex flex-col items-center gap-4">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    <div
                        onClick={() => fileInputRef.current.click()}
                        className="relative group cursor-pointer w-32 h-32 rounded-full overflow-hidden border-4 border-gray-50 shadow-inner"
                    >
                        {user?.profilePic ? (
                            <img src={user.profilePic} className="w-full h-full object-cover" alt="Profile" />
                        ) : (
                            <div className="w-full h-full bg-[#18bc9c] flex items-center justify-center text-4xl font-bold text-white uppercase">
                                {getInitials(user?.name)}
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="text-white" size={24} />
                        </div>
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Click image to upload</p>
                </div>

                <form onSubmit={nameForm.handleSubmit} className="flex-1 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Display Name</label>
                            <input type="text" {...nameForm.getFieldProps('name')} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#18bc9c]/20 outline-none text-sm font-medium transition-all" />
                        </div>
                        <div className="space-y-1.5 opacity-60">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                            <input type="text" disabled value={user?.email} className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm font-medium cursor-not-allowed" />
                        </div>
                    </div>
                    <button type="submit" disabled={isLoading} className="bg-[#2c3e50] text-white px-8 py-3 rounded-xl font-bold text-xs hover:bg-[#18bc9c] transition-all">
                        {isLoading ? <Loader size="sm" color="white" /> : 'Save Changes'}
                    </button>
                </form>
            </div>

            {/* 2. SECURITY SECTION */}
            <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-8 border-b border-gray-50 pb-4">
                    <Lock className="text-[#2c3e50]" size={18} />
                    <h3 className="font-bold text-[#2c3e50]">Security & Access Control</h3>
                </div>

                {user?.authProvider === 'local' || (user?.authProvider === 'google' && user?.hasPassword) ? (
                    <form onSubmit={passForm.handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 text-left">
                        <div className="space-y-1.5 relative">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Current Password</label>
                            <input type={showPass.old ? 'text' : 'password'} {...passForm.getFieldProps('oldPassword')} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#18bc9c]/20 outline-none text-sm pr-12" />
                            <button type="button" onClick={() => setShowPass(s => ({ ...s, old: !s.old }))} className="absolute right-4 top-9 text-gray-400">{showPass.old ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                        </div>
                        <div className="space-y-1.5 relative">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Password</label>
                            <input type={showPass.new ? 'text' : 'password'} {...passForm.getFieldProps('newPassword')} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#18bc9c]/20 outline-none text-sm pr-12" />
                            <button type="button" onClick={() => setShowPass(s => ({ ...s, new: !s.new }))} className="absolute right-4 top-9 text-gray-400">{showPass.new ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                        </div>
                        <div className="md:col-span-2">
                            <button type="submit" disabled={isLoading} className="cursor-pointer flex items-center gap-2 text-[#18bc9c] font-black text-[10px] uppercase tracking-widest hover:text-[#2c3e50] transition-colors mt-2">
                                Update Security Credentials <KeyRound size={14} />
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-6">
                        <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-4">
                            <ShieldCheck className="text-blue-500 shrink-0 mt-1" size={24} />
                            <div>
                                <h4 className="text-sm font-bold text-blue-700">Managed via Google Cloud</h4>
                                <p className="text-xs text-blue-600 mt-1 leading-relaxed opacity-80">
                                    You currently access ProManage Bot via Google authentication. For safety, we recommend setting a local backup password to ensure access if Google is down.
                                </p>
                            </div>
                        </div>
                        <div className="space-y-4 max-w-sm">
                            <div className="relative">
                                <input type={showPass.set ? 'text' : 'password'} id="setPass" placeholder="Enter Backup Password" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#18bc9c]/20 outline-none text-sm pr-12" />
                                <button onClick={() => setShowPass(s => ({ ...s, set: !s.set }))} className="absolute right-4 top-3 text-gray-400">{showPass.set ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                            </div>
                            <button onClick={() => setPassword(document.getElementById('setPass').value)} className="w-full bg-[#18bc9c] text-white py-3 rounded-xl font-bold text-xs hover:bg-[#128f76] transition-all">Enable Local Login</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;