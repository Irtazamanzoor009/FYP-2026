import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import { Eye, EyeOff } from 'lucide-react';
import Loader from '../../components/Loader';
import { FcGoogle } from "react-icons/fc";
import { useGoogleLogin } from '@react-oauth/google';

const Signup = () => {
    const navigate = useNavigate();
    const { signup, isLoading, googleSignIn } = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);

    const formik = useFormik({
        initialValues: { name: '', email: '', password: '' },
        validationSchema: Yup.object({
            name: Yup.string().required('Name is required'),
            email: Yup.string().email('Invalid email').required('Required'),
            password: Yup.string().min(6, 'At least 6 characters').required('Required'),
        }),
        onSubmit: async (values) => {
            const res = await signup(values);
            if (res.success) {
                toast.success(res.message);
                console.log("Response from signup: ", res);
                navigate('/verify-otp', { state: { userId: res.userId } });
            } else {
                toast.error(res.message);
            }
        },
    });

    const handleGoogleLogin = useGoogleLogin({
        flow: "auth-code",
        ux_mode: 'redirect',
        redirect_uri: import.meta.env.VITE_GOOGLE_REDIRECT_URI,
    });

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F5F5]">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-lg p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-[#2c3e50] mb-2">Join ProManage</h1>
                    <p className="text-gray-500 text-sm">Create an account to activate your AI Co-Pilot.</p>
                </div>

                <form onSubmit={formik.handleSubmit} className="space-y-4">
                    <div className="text-left">
                        <label className="block text-sm font-semibold text-[#2c3e50] mb-1.5">Full Name</label>
                        <input type="text" {...formik.getFieldProps('name')} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18bc9c]/20 focus:border-[#18bc9c] transition-all" />
                        {formik.touched.name && formik.errors.name && <span className="text-red-500 text-xs mt-1 block">{formik.errors.name}</span>}
                    </div>

                    <div className="text-left">
                        <label className="block text-sm font-semibold text-[#2c3e50] mb-1.5">Email</label>
                        <input type="email" {...formik.getFieldProps('email')} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18bc9c]/20 focus:border-[#18bc9c] transition-all" />
                        {formik.touched.email && formik.errors.email && <span className="text-red-500 text-xs mt-1 block">{formik.errors.email}</span>}
                    </div>

                    <div className="text-left relative">
                        <div className="flex justify-between mb-1.5">
                            <label className="block text-sm font-semibold text-[#2c3e50]">Password</label>
                        </div>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                {...formik.getFieldProps('password')}
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18bc9c]/20 focus:border-[#18bc9c] transition-all pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        {formik.touched.password && formik.errors.password && <span className="text-red-500 text-xs mt-1 block">{formik.errors.password}</span>}
                    </div>

                    <button type="submit" disabled={isLoading} className="cursor-pointer w-full bg-[#18bc9c] hover:bg-[#128f76] text-white font-semibold py-3 rounded-lg transition-all mt-4 disabled:opacity-70 disabled:cursor-not-allowed">
                        {isLoading ? (
                            <Loader size="sm" color="white" text="Creating Account..." textPosition="left" />
                        ) : (
                            'Signup'
                        )}
                    </button>
                </form>

                <p className="text-center text-sm text-gray-500 mt-6">
                    Already have an account? <Link to="/login" className="text-[#18bc9c] font-semibold hover:underline">Log In</Link>
                </p>

                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300" /></div>
                        <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">or continue with</span></div>
                    </div>
                    <div className="mt-6 grid grid-cols-1">
                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleGoogleLogin()}
                            className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 cursor-pointer">
                            <FcGoogle className="mr-2" size={20} />
                            Google
                        </button>

                    </div>
                </div>
            </div>
        </div>
    );
};
export default Signup;