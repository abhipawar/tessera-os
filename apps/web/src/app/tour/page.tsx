'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Network, GitBranch, ShieldCheck, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const slides = [
    {
        title: "The Agent Studio",
        subtitle: "Visual Programming for the Enterprise.",
        description: "Tessera OS allows you to design and compile autonomous digital workforces. Drag and drop nodes onto the canvas to map out reporting structures, data pipelines, and intelligent routing. No complex coding required.",
        icon: <Network className="w-16 h-16 text-blue-400" />,
        color: "from-blue-500/20 to-blue-900/20",
        border: "border-blue-500/20"
    },
    {
        title: "Multi-Agent Orchestration",
        subtitle: "Specialized Intelligence.",
        description: "Connect 'Supervisor' nodes to 'Worker' nodes. Supervisors autonomously decompose complex language requests from your inbox and route specific sub-tasks to highly specialized expert agents. They compile the final result automatically.",
        icon: <GitBranch className="w-16 h-16 text-indigo-400" />,
        color: "from-indigo-500/20 to-indigo-900/20",
        border: "border-indigo-500/20"
    },
    {
        title: "Human-Machine Synergy",
        subtitle: "Deterministic Approval Gates.",
        description: "Maintain absolute control over your environment. Empower agents to execute 99% of the grunt work, but configure 'Approval Nodes' so they pause and wait for your one-click authorization before sending emails, updating databases, or executing sensitive actions.",
        icon: <ShieldCheck className="w-16 h-16 text-emerald-400" />,
        color: "from-emerald-500/20 to-emerald-900/20",
        border: "border-emerald-500/20"
    }
];

export default function TourPage() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const router = useRouter();

    const nextSlide = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(prev => prev + 1);
        } else {
            router.push('/studio');
        }
    };

    const prevSlide = () => {
        if (currentSlide > 0) {
            setCurrentSlide(prev => prev - 1);
        }
    };

    return (
        <div className="min-h-screen w-full bg-zinc-950 flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
            {/* Background ambient light */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br ${slides[currentSlide].color} blur-[120px] rounded-full pointer-events-none transition-colors duration-1000`} />

            {/* Skip Button */}
            <div className="absolute top-8 right-8 z-20">
                <button onClick={() => router.push('/studio')} className="text-zinc-500 hover:text-zinc-300 text-sm font-medium transition-colors">
                    Skip Tour
                </button>
            </div>

            <div className="w-full max-w-4xl relative z-10 flex flex-col items-center">
                {/* Progress Dots */}
                <div className="flex gap-2 mb-12">
                    {slides.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentSlide ? 'w-8 bg-zinc-200' : 'w-2 bg-zinc-800'}`}
                        />
                    ))}
                </div>

                {/* Carousel Window */}
                <div className="relative w-full overflow-hidden min-h-[400px]">
                    <div
                        className="flex transition-transform duration-700 ease-in-out w-full h-full"
                        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                    >
                        {slides.map((slide, idx) => (
                            <div key={idx} className="w-full shrink-0 px-4">
                                <div className={`bg-zinc-900/40 backdrop-blur-xl border ${slide.border} p-12 rounded-3xl shadow-2xl flex flex-col items-center text-center max-w-2xl mx-auto`}>
                                    <div className="mb-8 p-6 bg-zinc-950/50 rounded-3xl inline-block shadow-inner">
                                        {slide.icon}
                                    </div>

                                    <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">{slide.title}</h2>
                                    <h3 className="text-lg font-medium text-zinc-400 mb-6">{slide.subtitle}</h3>
                                    <p className="text-base text-zinc-500 leading-relaxed font-light">
                                        {slide.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Navigation Controls */}
                <div className="flex items-center gap-6 mt-12">
                    <button
                        onClick={prevSlide}
                        disabled={currentSlide === 0}
                        className="w-14 h-14 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-zinc-900 disabled:hover:text-zinc-400 transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>

                    <button
                        onClick={nextSlide}
                        className={`h-14 px-8 rounded-full flex items-center justify-center gap-3 font-semibold transition-all ${currentSlide === slides.length - 1
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-500/50'
                                : 'bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                            }`}
                    >
                        {currentSlide === slides.length - 1 ? (
                            <>
                                Enter Studio <CheckCircle2 size={18} />
                            </>
                        ) : (
                            <>
                                Continue <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
