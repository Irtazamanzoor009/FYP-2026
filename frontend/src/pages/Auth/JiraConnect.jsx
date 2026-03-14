import React from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import Loader from '../../components/Loader';

const JiraConnect = () => {
    const navigate = useNavigate();
    const { saveJiraCreds, isLoading } = useAuthStore();

    const formik = useFormik({
        initialValues: { jiraDomain: '', jiraEmail: '', jiraApiToken: '' },
        validationSchema: Yup.object({
            jiraDomain: Yup.string().required('Required (e.g. company.atlassian.net)'),
            jiraEmail: Yup.string().email('Invalid email').required('Required'),
            jiraApiToken: Yup.string().required('Required'),
        }),
        onSubmit: async (values) => {
            const res = await saveJiraCreds(values);
            if (res.success) {
                toast.success("Jira connected securely!");
                navigate('/dashboard');
            } else {
                toast.error(res.message);
            }
        },
    });

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F5F5]">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-lg p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-[#2c3e50] mb-2">Connect to Jira</h1>
                    <p className="text-gray-500 text-sm">Link your workspace to allow ProManage AI to analyze tasks.</p>
                </div>

                <form onSubmit={formik.handleSubmit} className="space-y-4">
                    <div className="text-left">
                        <label className="block text-sm font-semibold text-[#2c3e50] mb-1.5">Jira Domain</label>
                        <input type="text" placeholder="yourcompany.atlassian.net" {...formik.getFieldProps('jiraDomain')} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18bc9c]/20 focus:border-[#18bc9c] transition-all" />
                        {formik.touched.jiraDomain && formik.errors.jiraDomain && <span className="text-red-500 text-xs mt-1 block">{formik.errors.jiraDomain}</span>}
                    </div>

                    <div className="text-left">
                        <label className="block text-sm font-semibold text-[#2c3e50] mb-1.5">Jira Account Email</label>
                        <input type="email" placeholder="email@company.com" {...formik.getFieldProps('jiraEmail')} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18bc9c]/20 focus:border-[#18bc9c] transition-all" />
                        {formik.touched.jiraEmail && formik.errors.jiraEmail && <span className="text-red-500 text-xs mt-1 block">{formik.errors.jiraEmail}</span>}
                    </div>

                    <div className="text-left">
                        <label className="block text-sm font-semibold text-[#2c3e50] mb-1.5">Jira API Token</label>
                        <input type="password" placeholder="Paste your Atlassian API token" {...formik.getFieldProps('jiraApiToken')} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18bc9c]/20 focus:border-[#18bc9c] transition-all" />
                        <span className="text-xs text-gray-400 mt-1 block">Generate this from Atlassian Account Settings &gt; Security.</span>
                        {formik.touched.jiraApiToken && formik.errors.jiraApiToken && <span className="text-red-500 text-xs mt-1 block">{formik.errors.jiraApiToken}</span>}
                    </div>

                    <button type="submit" disabled={isLoading} className="w-full bg-[#18bc9c] hover:bg-[#128f76] text-white font-semibold py-3 rounded-lg transition-all mt-6 disabled:opacity-70 disabled:cursor-not-allowed">
                        {isLoading ? (
                            <Loader size="sm" color="white" text="Connecting..." textPosition='left' />
                        ) : (
                            'Connect Jira & Continue'
                        )}
                    </button>

                    <button type="button" onClick={() => navigate('/dashboard')} className="w-full text-center text-sm font-semibold text-[#18bc9c] hover:underline mt-4">
                        Skip for now
                    </button>
                </form>
            </div>
        </div>
    );
};
export default JiraConnect;