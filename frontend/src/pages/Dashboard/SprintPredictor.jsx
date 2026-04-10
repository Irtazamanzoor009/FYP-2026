import React, { useEffect } from 'react';
import {
    BrainCircuit,
    TrendingUp,
    TrendingDown,
    RefreshCw,
    Loader2,
    AlertTriangle,
    CheckCircle2,
    Zap,
    Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import useMLStore from '../../store/mlStore';
import useAuthStore from '../../store/authStore';

const getProbabilityColor = (prob) => {
    if (prob >= 70) return '#18bc9c';
    if (prob >= 40) return '#f1c40f';
    return '#e74c3c';
};

const getOutcomeIcon = (outcome) => {
    if (outcome === 'LIKELY TO SUCCEED')
        return <CheckCircle2 size={20} className="text-[#18bc9c]" />;
    if (outcome === 'AT RISK')
        return <AlertTriangle size={20} className="text-yellow-500" />;
    return <AlertTriangle size={20} className="text-red-500" />;
};

const SprintPredictor = () => {
    const { prediction, isLoading, fetchPrediction } = useMLStore();
    const { selectedProject } = useAuthStore();

    useEffect(() => {
        fetchPrediction();
    }, [selectedProject?.key]);

    const handleRefresh = async () => {
        const tid = toast.loading('Running ML prediction...');
        await fetchPrediction(true);
        toast.success('Prediction updated!', { id: tid });
    };

    if (isLoading && !prediction) {
        return (
            <div className="flex items-center justify-center h-64 gap-3">
                <Loader2 size={24} className="animate-spin text-[#18bc9c]" />
                <span className="text-sm text-gray-500">Running ML model...</span>
            </div>
        );
    }

    if (!prediction) return null;

    const {
        success_probability,
        confidence,
        outcome,
        factors,
        recommendations,
        source,
        model_accuracy,
        sprint_name,
        grace_period,
        grace_period_message
    } = prediction;

    const isGracePeriod = grace_period === true;
    const probabilityColor = getProbabilityColor(success_probability);
    const circumference = 440;
    const strokeOffset = circumference - (circumference * success_probability) / 100;

    // ── Grace Period View ──
    if (isGracePeriod) {
        return (
            <div className="space-y-8 animate-in fade-in duration-500 pb-12">

                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between
                    items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <BrainCircuit size={22} className="text-[#18bc9c]" />
                            <h1 className="text-2xl font-bold text-[#2c3e50]">
                                ML Sprint Outcome Predictor
                            </h1>
                        </div>
                        <p className="text-sm text-gray-500">
                            Random Forest model with SHAP explainability.
                            {model_accuracy && (
                                <span className="ml-2 text-[#18bc9c] font-bold">
                                    Model Accuracy: {Math.round(model_accuracy * 100)}%
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black px-3 py-1.5 rounded-full
                            uppercase bg-blue-50 text-blue-500">
                            🕐 Early Sprint Phase
                        </span>
                        <button
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-white border
                                border-gray-200 rounded-xl text-xs font-bold text-gray-500
                                hover:border-[#18bc9c] hover:text-[#18bc9c] transition-all shadow-sm"
                        >
                            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                            Recalculate
                        </button>
                    </div>
                </header>

                {/* Grace Period Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100
                    p-12 flex flex-col items-center justify-center text-center gap-6">

                    <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center
                        justify-center">
                        <Clock size={36} className="text-blue-400" />
                    </div>

                    <div>
                        <h2 className="text-2xl font-black text-[#2c3e50] mb-2">
                            Predictions Not Yet Available
                        </h2>
                        <p className="text-gray-500 max-w-md">
                            {grace_period_message}
                        </p>
                    </div>

                    <div className="bg-[#f8fafa] rounded-2xl p-6 max-w-lg w-full
                        border border-gray-100">
                        <p className="text-xs font-black text-gray-400 uppercase
                            tracking-widest mb-4">
                            Why We Wait
                        </p>
                        <div className="space-y-3 text-left">
                            {[
                                'On Day 1-2, velocity = 0 because no tasks are done yet',
                                'The model interprets velocity=0 as sprint failure — a false alarm',
                                'After 20% of sprint days pass, real velocity data becomes available',
                                'Predictions from Day 3+ are statistically meaningful and accurate',
                            ].map((point, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-[#18bc9c]/10
                                        flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="text-[10px] font-black
                                            text-[#18bc9c]">{i + 1}</span>
                                    </div>
                                    <p className="text-xs text-gray-500">{point}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <p className="text-xs text-gray-400">
                        Predicted for:{' '}
                        <span className="font-bold text-[#2c3e50]">{sprint_name}</span>
                    </p>
                </div>

                {/* Recommendations still shown */}
                {recommendations && recommendations.length > 0 && (
                    <div className="bg-[#2c3e50] p-6 rounded-2xl shadow-xl text-white">
                        <div className="flex items-center gap-2 mb-4">
                            <BrainCircuit size={18} className="text-[#18bc9c]" />
                            <h3 className="font-bold text-sm">
                                Early Sprint Guidance
                            </h3>
                        </div>
                        <div className="space-y-3">
                            {recommendations.map((rec, i) => (
                                <div key={i}
                                    className="flex items-start gap-3 p-3 bg-white/5
                                        rounded-xl border border-white/10">
                                    <div className="text-[10px] font-black px-2 py-1
                                        rounded shrink-0 bg-white/10 text-gray-400">
                                        {rec.priority}
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-200 leading-relaxed">
                                            {rec.action}
                                        </p>
                                        <p className="text-[10px] text-[#18bc9c] mt-1 font-bold">
                                            {rec.impact}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ── Normal Prediction View ──
    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">

            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between
                items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <BrainCircuit size={22} className="text-[#18bc9c]" />
                        <h1 className="text-2xl font-bold text-[#2c3e50]">
                            ML Sprint Outcome Predictor
                        </h1>
                    </div>
                    <p className="text-sm text-gray-500">
                        Random Forest model with SHAP explainability.
                        {model_accuracy && (
                            <span className="ml-2 text-[#18bc9c] font-bold">
                                Model Accuracy: {Math.round(model_accuracy * 100)}%
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-black px-3 py-1.5 rounded-full
                        uppercase ${source === 'ml_model'
                            ? 'bg-[#18bc9c]/10 text-[#18bc9c]'
                            : 'bg-yellow-50 text-yellow-600'
                        }`}>
                        {source === 'ml_model'
                            ? '🤖 ML Model Active'
                            : '⚠ Rule-Based Fallback'
                        }
                    </span>
                    <button
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border
                            border-gray-200 rounded-xl text-xs font-bold text-gray-500
                            hover:border-[#18bc9c] hover:text-[#18bc9c] transition-all shadow-sm"
                    >
                        <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                        Recalculate
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Probability Gauge */}
                <div className="lg:col-span-1 bg-white p-8 rounded-2xl shadow-sm
                    border border-gray-100 flex flex-col items-center">
                    <h3 className="text-xs font-black text-gray-400 uppercase
                        tracking-widest mb-6">
                        Sprint Success Probability
                    </h3>

                    <div className="relative w-44 h-44 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="88" cy="88" r="70"
                                stroke="#f3f4f6" strokeWidth="14"
                                fill="transparent"
                            />
                            <circle
                                cx="88" cy="88" r="70"
                                stroke={probabilityColor}
                                strokeWidth="14" fill="transparent"
                                strokeLinecap="round"
                                style={{
                                    strokeDasharray: circumference,
                                    strokeDashoffset: strokeOffset,
                                    transition: 'stroke-dashoffset 1.5s ease'
                                }}
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-4xl font-black"
                                style={{ color: probabilityColor }}>
                                {success_probability}%
                            </span>
                            <span className="text-[10px] font-bold text-gray-400">
                                Confidence: {confidence}%
                            </span>
                        </div>
                    </div>

                    <div className="mt-6 flex items-center gap-2 px-4 py-3 rounded-xl
                        w-full justify-center"
                        style={{
                            backgroundColor: `${probabilityColor}15`,
                            border: `1px solid ${probabilityColor}30`
                        }}>
                        {getOutcomeIcon(outcome)}
                        <span className="text-sm font-black"
                            style={{ color: probabilityColor }}>
                            {outcome}
                        </span>
                    </div>

                    <p className="text-[11px] text-gray-400 mt-4 text-center
                        leading-relaxed">
                        Predicted for:{' '}
                        <b className="text-[#2c3e50]">{sprint_name}</b>
                    </p>
                </div>

                {/* SHAP Factor Analysis */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-6">
                            <Zap size={18} className="text-[#18bc9c]" />
                            <h3 className="font-bold text-[#2c3e50]">
                                SHAP Factor Analysis
                            </h3>
                            <span className="text-[10px] text-gray-400 ml-auto">
                                Which factors most influence this prediction
                            </span>
                        </div>

                        {factors && factors.length > 0 ? (
                            <div className="space-y-4">
                                {factors.map((factor, i) => {
                                    const isPositive = factor.direction === 'positive';
                                    const barColor = isPositive ? '#18bc9c' : '#e74c3c';
                                    const barWidth = Math.min(
                                        factor.impact_percent * 2, 100
                                    );
                                    return (
                                        <div key={i}>
                                            <div className="flex items-center
                                                justify-between mb-1.5">
                                                <div className="flex items-center gap-2">
                                                    {isPositive
                                                        ? <TrendingUp size={14}
                                                            className="text-[#18bc9c]" />
                                                        : <TrendingDown size={14}
                                                            className="text-red-500" />
                                                    }
                                                    <span className="text-xs font-bold
                                                        text-[#2c3e50]">
                                                        {factor.label}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-gray-400">
                                                        value: {
                                                            factor.feature === 'completion_pct'
                                                                ? `${factor.value.toFixed(1)}%`
                                                                : factor.value.toFixed(3)
                                                        }
                                                    </span>
                                                    <span className="text-[10px] font-black"
                                                        style={{ color: barColor }}>
                                                        {isPositive ? '+' : '-'}
                                                        {factor.impact_percent.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="w-full bg-gray-100
                                                rounded-full h-2">
                                                <div
                                                    className="h-full rounded-full
                                                        transition-all duration-1000"
                                                    style={{
                                                        width: `${barWidth}%`,
                                                        backgroundColor: barColor
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 text-center py-4">
                                ML service unavailable — using rule-based analysis
                            </p>
                        )}
                    </div>

                    {/* Recommendations */}
                    <div className="bg-[#2c3e50] p-6 rounded-2xl shadow-xl text-white">
                        <div className="flex items-center gap-2 mb-4">
                            <BrainCircuit size={18} className="text-[#18bc9c]" />
                            <h3 className="font-bold text-sm">
                                AI Recommendations to Improve Outcome
                            </h3>
                        </div>
                        <div className="space-y-3">
                            {recommendations?.map((rec, i) => (
                                <div key={i}
                                    className="flex items-start gap-3 p-3 bg-white/5
                                        rounded-xl border border-white/10">
                                    <div className={`text-[10px] font-black px-2 py-1
                                        rounded shrink-0 ${rec.priority === 'CRITICAL'
                                            ? 'bg-red-500/20 text-red-300'
                                            : rec.priority === 'HIGH'
                                                ? 'bg-orange-500/20 text-orange-300'
                                                : 'bg-white/10 text-gray-400'
                                        }`}>
                                        {rec.priority}
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-200 leading-relaxed">
                                            {rec.action}
                                        </p>
                                        <p className="text-[10px] text-[#18bc9c] mt-1
                                            font-bold">
                                            {rec.impact}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SprintPredictor;