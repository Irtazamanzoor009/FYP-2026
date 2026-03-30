import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bot,
    Brain,
    BarChart2,
    AlertTriangle,
    Lightbulb,
    TrendingUp,
    Zap,
    Link2,
    MessageSquareText,
    Trees,
    CheckCircle2,
    Link,
    RefreshCw,
    Network,
    GitBranch
} from 'lucide-react';

// ── Animated counter hook ──
function useCounter(target, duration = 2000, startOnView = true) {
    const [count, setCount] = useState(0);
    const [started, setStarted] = useState(!startOnView);
    const ref = useRef(null);

    useEffect(() => {
        if (!startOnView) return;
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting) { setStarted(true); obs.disconnect(); }
        }, { threshold: 0.3 });
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [startOnView]);

    useEffect(() => {
        if (!started) return;
        let start = 0;
        const step = target / (duration / 16);
        const timer = setInterval(() => {
            start += step;
            if (start >= target) { setCount(target); clearInterval(timer); }
            else setCount(Math.floor(start));
        }, 16);
        return () => clearInterval(timer);
    }, [started, target, duration]);

    return [count, ref];
}

// ── Floating particle background ──
function Particles() {
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animId;
        const resize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const dots = Array.from({ length: 40 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 2 + 1,
            dx: (Math.random() - 0.5) * 0.4,
            dy: (Math.random() - 0.5) * 0.4,
            opacity: Math.random() * 0.4 + 0.1,
        }));

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            dots.forEach(d => {
                d.x += d.dx; d.y += d.dy;
                if (d.x < 0 || d.x > canvas.width) d.dx *= -1;
                if (d.y < 0 || d.y > canvas.height) d.dy *= -1;
                ctx.beginPath();
                ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(24, 188, 156, ${d.opacity})`;
                ctx.fill();
            });
            // draw faint lines between close dots
            for (let i = 0; i < dots.length; i++) {
                for (let j = i + 1; j < dots.length; j++) {
                    const dx = dots[i].x - dots[j].x;
                    const dy = dots[i].y - dots[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 100) {
                        ctx.beginPath();
                        ctx.moveTo(dots[i].x, dots[i].y);
                        ctx.lineTo(dots[j].x, dots[j].y);
                        ctx.strokeStyle = `rgba(24, 188, 156, ${0.08 * (1 - dist / 100)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }
            animId = requestAnimationFrame(draw);
        };
        draw();
        return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
    }, []);
    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

// ── Feature Card ──
function FeatureCard({ icon, title, desc, accent, delay }) {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
        }, { threshold: 0.1 });
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className="group relative bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden cursor-default"
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(30px)',
                transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms, box-shadow 0.3s ease`,
            }}
        >
            {/* accent top bar */}
            <div className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />

            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 text-2xl"
                style={{ background: `${accent}15` }}>
                {icon}
            </div>
            <h3 className="font-bold text-[#2c3e50] text-base mb-2 leading-snug">{title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>

            {/* subtle corner glow on hover */}
            <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-500"
                style={{ background: accent }} />
        </div>
    );
}


// ── Stat Card ──
function StatCard({ value, suffix, label, delay }) {
    const [count, setCount] = useState(0);
    const [visible, setVisible] = useState(false);
    const wrapRef = useRef(null);

    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
        }, { threshold: 0.2 });
        if (wrapRef.current) obs.observe(wrapRef.current);
        return () => obs.disconnect();
    }, []);

    // Start counter once visible
    useEffect(() => {
        if (!visible) return;
        let start = 0;
        const duration = 1800;
        const step = value / (duration / 16);
        const timer = setInterval(() => {
            start += step;
            if (start >= value) { setCount(value); clearInterval(timer); }
            else setCount(Math.floor(start));
        }, 16);
        return () => clearInterval(timer);
    }, [visible, value]);

    return (
        <div
            ref={wrapRef}
            className="text-center"
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(20px)',
                transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
            }}
        >
            <div className="text-5xl font-black text-white mb-1 tabular-nums">
                {count}{suffix}
            </div>
            <p className="text-sm text-gray-400 font-medium">{label}</p>
        </div>
    );
}

// ── Main Landing Page ──
export default function LandingPage() {
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const features = [
        {
            icon: <Brain size={22} color="#18bc9c" />,
            title: 'AI Sprint Planning',
            desc: 'ML-powered duration estimates for every task. Assigns the right developer based on skill match, workload balance, and task type detection.',
            accent: '#18bc9c',
            delay: 0,
        },
        {
            icon: <BarChart2 size={22} color="#3498db" />,
            title: 'Sprint Outcome Predictor',
            desc: 'Random Forest model analyzes 8 real-time Jira metrics and predicts sprint success probability before deadline — with SHAP factor explanations.',
            accent: '#3498db',
            delay: 100,
        },
        {
            icon: <AlertTriangle size={22} color="#e74c3c" />,
            title: 'Anomaly Detection',
            desc: 'Isolation Forest monitors daily velocity, blocked ratio, and workload patterns. Alerts you when sprint behavior deviates from your team\'s baseline.',
            accent: '#e74c3c',
            delay: 200,
        },
        {
            icon: <Lightbulb size={22} color="#f39c12" />,
            title: 'AI Suggestion Board',
            desc: 'Gemini AI detects overloaded members, deadline risks, and dependency bottlenecks — then generates actionable suggestions with one-click Jira sync.',
            accent: '#f39c12',
            delay: 300,
        },
        {
            icon: <TrendingUp size={22} color="#9b59b6" />,
            title: 'Sprint History & Learning',
            desc: 'Predicted vs actual comparison per task. Personal ML model retrains after every sprint — improving accuracy sprint over sprint automatically.',
            accent: '#9b59b6',
            delay: 400,
        },
        {
            icon: <Zap size={22} color="#18bc9c" />,
            title: 'Live Monitoring & Alerts',
            desc: 'WebSocket-powered live agent feed. Background cron jobs check for deadline breaches, overload, and Jira sync issues every 5 minutes.',
            accent: '#18bc9c',
            delay: 500,
        },
        {
            icon: <Link2 size={22} color="#3498db" />,
            title: 'Deep Jira Integration',
            desc: 'Reads active sprint, closed sprints, team members, and story points in real time. Approve suggestions and push planned sprints directly to Jira.',
            accent: '#3498db',
            delay: 600,
        },
        {
            icon: <MessageSquareText size={22} color="#e74c3c" />,
            title: 'AI Co-Pilot Chat',
            desc: 'Ask questions about your sprint in natural language. Gemini-powered chatbot knows your Jira data, risk scores, and team workload.',
            accent: '#e74c3c',
            delay: 700,
        },
    ];

    const steps = [
        { num: '01', title: 'Connect Jira', desc: 'Link your Jira workspace in one click. We auto-detect projects, boards, and story points.' },
        { num: '02', title: 'AI Analyzes Sprint', desc: 'Three ML models immediately analyze your active sprint and generate insights.' },
        { num: '03', title: 'Review Suggestions', desc: 'Approve AI suggestions to reassign tasks, extend deadlines, or escalate blockers.' },
        { num: '04', title: 'Model Gets Smarter', desc: 'After each sprint, personal models retrain on your team\'s real data — improving forever.' },
    ];

    return (
        <div className="min-h-screen bg-white font-sans overflow-x-hidden">

            {/* ── NAVBAR ── */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#18bc9c] rounded-xl flex items-center justify-center shadow-lg shadow-[#18bc9c]/20">
                            <Bot className="text-white" size={24} />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">
                            ProManage <span className="text-[#18bc9c]">Bot</span>
                        </h1>
                    </div>
                    {/* Desktop nav links */}
                    <div className="hidden md:flex items-center gap-8">
                        {['Features', 'How It Works', 'ML Models'].map(link => (
                            <a
                                key={link}
                                href={`#${link.toLowerCase().replace(/ /g, '-')}`}
                                className="text-sm font-semibold text-gray-500 hover:text-[#2c3e50] transition-colors"
                            >
                                {link}
                            </a>
                        ))}
                    </div>

                    {/* CTA buttons */}
                    <div className="hidden md:flex items-center gap-3">
                        <button
                            onClick={() => navigate('/login')}
                            className="cursor-pointer px-5 py-2 text-sm font-bold text-[#2c3e50] hover:text-[#18bc9c] transition-colors"
                        >
                            Log In
                        </button>
                        <button
                            onClick={() => navigate('/signup')}
                            className="cursor-pointer px-5 py-2 text-sm font-bold bg-[#2c3e50] text-white rounded-xl hover:bg-[#18bc9c] transition-all duration-300 shadow-sm hover:shadow-md"
                        >
                            Get Started →
                        </button>
                    </div>

                    {/* Mobile menu button */}
                    <button
                        className="md:hidden w-9 h-9 flex flex-col justify-center items-center gap-1.5"
                        onClick={() => setMobileOpen(!mobileOpen)}
                    >
                        <span className={`w-5 h-0.5 bg-[#2c3e50] transition-all ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
                        <span className={`w-5 h-0.5 bg-[#2c3e50] transition-all ${mobileOpen ? 'opacity-0' : ''}`} />
                        <span className={`w-5 h-0.5 bg-[#2c3e50] transition-all ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
                    </button>
                </div>

                {/* Mobile menu */}
                {mobileOpen && (
                    <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-3">
                        {['Features', 'How It Works', 'ML Models'].map(link => (
                            <a key={link} href={`#${link.toLowerCase().replace(/ /g, '-')}`}
                                className="block text-sm font-semibold text-gray-600 py-2"
                                onClick={() => setMobileOpen(false)}>
                                {link}
                            </a>
                        ))}
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => navigate('/login')}
                                className="flex-1 py-2 text-sm font-bold border border-gray-200 rounded-xl text-[#2c3e50]">
                                Log In
                            </button>
                            <button onClick={() => navigate('/signup')}
                                className="flex-1 py-2 text-sm font-bold bg-[#2c3e50] text-white rounded-xl">
                                Sign Up
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            {/* ── HERO SECTION ── */}
            <section className="relative min-h-screen flex items-center overflow-hidden bg-[#f8fafa]">
                <Particles />

                {/* large decorative circle */}
                <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-5"
                    style={{ background: 'radial-gradient(circle, #18bc9c, transparent)' }} />
                <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full opacity-5"
                    style={{ background: 'radial-gradient(circle, #2c3e50, transparent)' }} />

                <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-16 w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                        {/* Left — text */}
                        <div>
                            <div className="inline-flex items-center gap-2 bg-[#18bc9c]/10 border border-[#18bc9c]/20 rounded-full px-4 py-1.5 mb-6">
                                <span className="w-2 h-2 rounded-full bg-[#18bc9c] animate-pulse" />
                                <span className="text-xs font-bold text-[#18bc9c] uppercase tracking-wider">
                                    AI-Powered Project Management
                                </span>
                            </div>

                            <h1 className="text-5xl lg:text-6xl font-black text-[#2c3e50] leading-[1.1] mb-6">
                                Your Sprint,
                                <br />
                                <span className="relative">
                                    <span className="text-[#18bc9c]">Predicted</span>
                                    <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 300 8" fill="none">
                                        <path d="M2 6 Q75 2 150 6 Q225 10 298 4" stroke="#18bc9c" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.4" />
                                    </svg>
                                </span>
                                <br />
                                Before It Fails.
                            </h1>

                            <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-lg">
                                ProManage Bot connects to your Jira workspace and uses three ML models
                                to predict sprint outcomes, estimate task durations, and detect anomalies
                                — so you can fix problems before they become crises.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-3 mb-10">
                                <button
                                    onClick={() => navigate('/signup')}
                                    className="cursor-pointer group px-8 py-4 bg-[#2c3e50] text-white font-bold rounded-2xl hover:bg-[#18bc9c] transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                                >
                                    Start Free Today
                                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                                </button>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="cursor-pointer px-8 py-4 bg-white text-[#2c3e50] font-bold rounded-2xl border border-gray-200 hover:border-[#18bc9c] hover:text-[#18bc9c] transition-all duration-300"
                                >
                                    Sign In
                                </button>
                            </div>

                            {/* Trust badges */}
                            <div className="flex items-center gap-6 text-xs text-gray-400">
                                {['Jira Connected', '3 ML Models', 'Self-Learning AI'].map(b => (
                                    <div key={b} className="flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5 text-[#18bc9c]" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        <span className="font-semibold">{b}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right — dashboard mockup card */}
                        <div className="relative hidden lg:block">
                            <div className="relative bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
                                style={{ transform: 'perspective(1000px) rotateY(-8deg) rotateX(3deg)' }}>

                                {/* mock header bar */}
                                <div className="bg-[#2c3e50] px-5 py-3 flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-400" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                                    <div className="w-3 h-3 rounded-full bg-green-400" />
                                    <span className="ml-4 text-xs text-gray-400 font-mono">ProManage Bot — Sprint 5</span>
                                </div>

                                <div className="p-5 space-y-4">
                                    {/* Health score row */}
                                    <div className="flex items-center justify-between bg-[#f8fafa] rounded-xl p-4">
                                        <div>
                                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Sprint Health</p>
                                            <p className="text-3xl font-black text-[#2c3e50]">72%</p>
                                            <p className="text-xs text-yellow-500 font-bold">⚠ At Risk</p>
                                        </div>
                                        <div className="w-16 h-16 relative">
                                            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                                <circle cx="18" cy="18" r="15" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                                                <circle cx="18" cy="18" r="15" fill="none" stroke="#18bc9c" strokeWidth="3"
                                                    strokeDasharray={`${72 * 0.942} ${100 * 0.942}`} strokeLinecap="round" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Top Actions */}
                                    <div className="space-y-2">
                                        {[
                                            { icon: '🔴', text: 'John Doe overloaded (95%). Reassign WR-29', tag: 'URGENT' },
                                            { icon: '🟡', text: 'WR-29 is 3 days overdue — review blockers', tag: 'HIGH' },
                                            { icon: '🔵', text: '3 tasks blocked by WR-31 dependency', tag: 'SOON' },
                                        ].map((a, i) => (
                                            <div key={i} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-3 py-2.5">
                                                <span>{a.icon}</span>
                                                <span className="text-xs text-gray-600 flex-1">{a.text}</span>
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${a.tag === 'URGENT' ? 'bg-red-50 text-red-500' : a.tag === 'HIGH' ? 'bg-yellow-50 text-yellow-600' : 'bg-blue-50 text-blue-500'}`}>
                                                    {a.tag}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Team workload mini bars */}
                                    <div className="space-y-2">
                                        {[
                                            { name: 'John Doe', pct: 95, status: 'Overloaded' },
                                            { name: 'Alex Smith', pct: 62, status: 'Optimal' },
                                            { name: 'Sam Taylor', pct: 78, status: 'Warning' },
                                        ].map((m, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <div className="w-7 h-7 rounded-full bg-[#2c3e50] flex items-center justify-center text-white text-[10px] font-black shrink-0">
                                                    {m.name[0]}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between mb-1">
                                                        <span className="text-[10px] font-bold text-gray-600">{m.name}</span>
                                                        <span className={`text-[9px] font-black ${m.status === 'Overloaded' ? 'text-red-500' : m.status === 'Warning' ? 'text-yellow-500' : 'text-[#18bc9c]'}`}>{m.pct}%</span>
                                                    </div>
                                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full transition-all"
                                                            style={{
                                                                width: `${Math.min(m.pct, 100)}%`,
                                                                background: m.status === 'Overloaded' ? '#ef4444' : m.status === 'Warning' ? '#f59e0b' : '#18bc9c'
                                                            }} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Floating badge */}
                            <div className="absolute -bottom-8 -left-16 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
                                <div className="w-8 h-8 bg-[#18bc9c]/10 rounded-xl flex items-center justify-center">
                                    <Brain size={16} color="#18bc9c" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 font-bold">ML Prediction</p>
                                    <p className="text-xs font-black text-[#2c3e50]">87% Success Rate</p>
                                </div>
                            </div>

                            <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
                                <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center">
                                    <AlertTriangle size={16} color="#ef4444" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 font-bold">Anomaly Alert</p>
                                    <p className="text-xs font-black text-red-500">Detected 2m ago</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── STATS STRIP ── */}
            <section className="bg-[#2c3e50] py-14">
                <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
                    <StatCard value={3} suffix="" label="ML Models Active" delay={0} />
                    <StatCard value={8} suffix="+" label="Jira Metrics Monitored" delay={150} />
                    <StatCard value={85} suffix="%" label="Sprint Predictor Accuracy" delay={300} />
                    <StatCard value={5} suffix="min" label="Real-time Sync Interval" delay={450} />
                </div>
            </section>

            {/* ── FEATURES GRID ── */}
            <section id="features" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <span className="text-xs font-black text-[#18bc9c] uppercase tracking-widest">Everything You Need</span>
                        <h2 className="text-4xl font-black text-[#2c3e50] mt-3 mb-4">Built for Modern Project Managers</h2>
                        <p className="text-gray-500 max-w-xl mx-auto">
                            Eight integrated features that turn raw Jira data into actionable intelligence — powered by three machine learning models working in real time.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {features.map((f, i) => <FeatureCard key={i} {...f} />)}
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section id="how-it-works" className="py-24 bg-[#f8fafa]">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <span className="text-xs font-black text-[#18bc9c] uppercase tracking-widest">Simple Process</span>
                        <h2 className="text-4xl font-black text-[#2c3e50] mt-3 mb-4">Up and Running in Minutes</h2>
                        <p className="text-gray-500">No setup complexity. Connect Jira and the AI starts working immediately.</p>
                    </div>

                    <div className="relative">
                        {/* connector line */}
                        <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-transparent via-[#18bc9c]/30 to-transparent" />

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            {steps.map((s, i) => (
                                <div key={i} className="text-center relative">
                                    <div className="w-20 h-20 rounded-2xl bg-white shadow-md border border-gray-100 flex flex-col items-center justify-center mx-auto mb-5 relative z-10">
                                        <span className="text-xs font-black text-[#18bc9c]">{s.num}</span>
                                        <div className="w-6 h-0.5 bg-gray-200 my-1" />
                                        <span className="text-lg">
                                            {[
                                                <Link size={18} color="#18bc9c" />,
                                                <Brain size={18} color="#18bc9c" />,
                                                <CheckCircle2 size={18} color="#18bc9c" />,
                                                <RefreshCw size={18} color="#18bc9c" />,
                                            ][i]}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-[#2c3e50] mb-2">{s.title}</h3>
                                    <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── ML MODELS SECTION ── */}
            <section id="ml-models" className="py-24 bg-white">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <span className="text-xs font-black text-[#18bc9c] uppercase tracking-widest">The Intelligence Layer</span>
                        <h2 className="text-4xl font-black text-[#2c3e50] mt-3 mb-4">Three Models, One System</h2>
                        <p className="text-gray-500 max-w-xl mx-auto">
                            Each model serves a different purpose and improves independently — creating a self-reinforcing intelligence layer that grows with your team.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                color: '#3498db',
                                icon: <GitBranch size={22} color="#3498db" />,
                                name: 'Random Forest',
                                label: 'Sprint Outcome Predictor',
                                accuracy: '85%',
                                accLabel: 'Accuracy',
                                desc: 'Analyzes 8 sprint metrics from Jira in real time and predicts whether your sprint will succeed or fail — before it does.',
                                tags: ['500 training sprints', 'SHAP explainability', '8 features'],
                            },
                            {
                                color: '#18bc9c',
                                icon: <TrendingUp size={22} color="#18bc9c" />,
                                name: 'Gradient Boosting',
                                label: 'Task Duration Estimator',
                                accuracy: '1.21d',
                                accLabel: 'Avg Error (MAE)',
                                desc: 'Predicts exactly how many days each task will take. Self-learning — retrains on your real sprint data after every sprint ends.',
                                tags: ['932 training samples', 'Personal model per team', 'Self-learning'],
                            },
                            {
                                color: '#9b59b6',
                                icon: <Network size={22} color="#9b59b6" />,
                                name: 'Isolation Forest',
                                label: 'Anomaly Detector',
                                accuracy: 'Unsupervised',
                                accLabel: 'No Labels Needed',
                                desc: 'Learns YOUR team\'s normal sprint behavior without labeled data. Flags deviations in velocity, blocked tasks, and workload ratios.',
                                tags: ['800 baseline samples', 'Personal baseline', 'Zero false negatives'],
                            },
                        ].map((m, i) => (
                            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-7 shadow-sm hover:shadow-lg transition-shadow">
                                <div className="flex items-start justify-between mb-5">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                                        style={{ background: `${m.color}15` }}>
                                        {m.icon}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-black" style={{ color: m.color }}>{m.accuracy}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">{m.accLabel}</p>
                                    </div>
                                </div>

                                <div className="mb-1">
                                    <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: m.color }}>{m.name}</span>
                                </div>
                                <h3 className="font-black text-[#2c3e50] text-base mb-3">{m.label}</h3>
                                <p className="text-sm text-gray-500 leading-relaxed mb-5">{m.desc}</p>

                                <div className="flex flex-wrap gap-1.5">
                                    {m.tags.map(t => (
                                        <span key={t} className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-50 text-gray-500 border border-gray-100">
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA SECTION ── */}
            <section className="py-24 relative overflow-hidden bg-[#2c3e50]">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full"
                        style={{ background: 'radial-gradient(circle, #18bc9c, transparent)' }} />
                    <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full"
                        style={{ background: 'radial-gradient(circle, #3498db, transparent)' }} />
                </div>

                <div className="relative max-w-3xl mx-auto px-6 text-center">
                    <span className="text-xs font-black text-[#18bc9c] uppercase tracking-widest">Ready to Start?</span>
                    <h2 className="text-5xl font-black text-white mt-4 mb-5 leading-tight">
                        Stop Guessing.<br />Start Predicting.
                    </h2>
                    <p className="text-gray-400 text-lg mb-10 leading-relaxed">
                        Connect your Jira workspace and let three ML models tell you what's going wrong before it goes wrong.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={() => navigate('/signup')}
                            className="cursor-pointer group px-10 py-4 bg-[#18bc9c] text-white font-black rounded-2xl hover:bg-white hover:text-[#2c3e50] transition-all duration-300 shadow-xl text-base flex items-center justify-center gap-2"
                        >
                            Create Free Account
                            <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            className="cursor-pointer px-10 py-4 bg-white/10 text-white font-bold rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300 text-base"
                        >
                            Sign In to Dashboard
                        </button>
                    </div>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer className="bg-[#1a252f] py-12">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">

                        {/* Brand */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#18bc9c] rounded-xl flex items-center justify-center shadow-lg shadow-[#18bc9c]/20">
                                <Bot className="text-white" size={24} />
                            </div>
                            <h1 className="text-xl font-bold tracking-tight text-amber-50">
                                ProManage <span className="text-[#18bc9c]">Bot</span>
                            </h1>
                        </div>

                        {/* Links */}
                        <div className="flex items-center gap-6 text-sm text-gray-500">
                            {['Features', 'How It Works', 'ML Models'].map(l => (
                                <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`}
                                    className="hover:text-[#18bc9c] transition-colors">{l}</a>
                            ))}
                        </div>

                        {/* Auth */}
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate('/login')}
                                className="cursor-pointer text-sm text-gray-400 hover:text-white transition-colors font-semibold">
                                Sign In
                            </button>
                            <button onClick={() => navigate('/signup')}
                                className="cursor-pointer px-4 py-2 bg-[#18bc9c] text-white text-sm font-bold rounded-xl hover:bg-[#18bc9c]/80 transition-colors">
                                Get Started
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-600">
                        <p>© 2026 ProManage Bot. Final Year Project — AI-Powered Sprint Intelligence.</p>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#18bc9c] animate-pulse" />
                            <span>3 ML Models Active · Jira Connected · Real-time Monitoring</span>
                        </div>
                    </div>
                </div>
            </footer>

        </div>
    );
}