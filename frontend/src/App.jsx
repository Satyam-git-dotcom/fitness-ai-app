import { useEffect, useState } from "react";
import { 
  Plus, 
  Trophy, 
  Activity, 
  Flame, 
  Sparkles, 
  Dumbbell, 
  ChevronRight, 
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  BrainCircuit
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE;

const EXERCISE_DATABASE = [
  "Barbell Back Squat", "Bench Press", "Conventional Deadlift", 
  "Overhead Press", "Barbell Row", "Incline Bench Press", 
  "Lateral Raise", "Dumbbell Curl", "Tricep Pushdown", 
  "Lat Pulldown", "Leg Press", "Face Pull"
];

function App() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [recLoading, setRecLoading] = useState(true);
  const [aiScore, setAiScore] = useState(null);
  
  // Logging State
  const [logStep, setLogStep] = useState("exercise"); // exercise, sets
  const [currentLog, setCurrentLog] = useState({
    exercise: "",
    sets: [{ weight_kg: "", reps: "", rpe: "" }],
    muscle_group: ""
  });

  const fetchWorkouts = async () => {
    try {
      const res = await fetch(`${API_BASE}/workouts/Satyam`);
      const data = await res.json();
      setWorkouts(data.workouts || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    setRecLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ai/recommendations/Satyam`);
      const data = await res.json();
      setRecommendations(data.data?.recommendations || []);
      setAiScore(data.data?.score ?? null);
      setRecLoading(false);
    } catch (err) {
      setRecLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkouts();
    fetchRecommendations();
  }, []);

  const handleAddSet = () => {
    setCurrentLog({
      ...currentLog,
      sets: [...currentLog.sets, { weight_kg: "", reps: "", rpe: "" }]
    });
  };

  const handleSetChange = (index, field, value) => {
    const updatedSets = [...currentLog.sets];
    updatedSets[index][field] = value;
    setCurrentLog({ ...currentLog, sets: updatedSets });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      user_name: "Satyam",
      exercise: currentLog.exercise,
      sets: currentLog.sets.map(s => ({
        weight_kg: Number(s.weight_kg),
        reps: Number(s.reps),
        rpe: Number(s.rpe) || null
      })),
      date: new Date().toISOString().split('T')[0],
      muscle_group: currentLog.muscle_group || "Full Body"
    };

    try {
      await fetch(`${API_BASE}/workout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      // Reset and refresh
      setCurrentLog({
        exercise: "",
        sets: [{ weight_kg: "", reps: "", rpe: "" }],
        muscle_group: ""
      });
      setLogStep("exercise");
      fetchWorkouts();
      fetchRecommendations();
    } catch (err) {
      console.error(err);
    }
  };

  const calculate1RM = (weight, reps) => {
    if (!weight || !reps) return 0;
    return Math.round(weight * (1 + reps / 30));
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-4">
        <BrainCircuit className="w-12 h-12 text-primary animate-pulse" />
        <p className="text-zinc-400 font-medium tracking-widest text-xs uppercase">Initializing FitTrack AI...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white shadow-xl">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg">
              <Activity className="w-5 h-5 text-zinc-950" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">FitTrack <span className="text-primary">AI</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs text-zinc-500 font-medium">ATHLETE</span>
              <span className="text-sm font-semibold uppercase">Satyam</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass rounded-3xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Flame className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-tighter">Consistency</span>
            </div>
            <p className="text-3xl font-bold">{workouts.length}</p>
            <p className="text-sm text-zinc-400">Total sessions logged</p>
          </div>

          <div className="glass rounded-3xl p-6 animate-slide-up delay-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-tighter">Peak Power</span>
            </div>
            <p className="text-3xl font-bold">
              {workouts.length ? Math.max(...workouts.map(w => calculate1RM(w.sets[0]?.weight_kg, w.sets[0]?.reps))) : 0} <span className="text-sm font-medium text-zinc-500">kg</span>
            </p>
            <p className="text-sm text-zinc-400">Best Estimated 1RM</p>
          </div>

          <div className="glass rounded-3xl p-6 animate-slide-up delay-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-tighter">AI Rank</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-white">{aiScore ?? "--"}</p>
              <p className="text-sm font-medium text-zinc-500">/ 100</p>
            </div>
            <p className="text-sm text-zinc-400">Personal performance score</p>
          </div>
        </div>

        {/* AI Insight Section */}
        <section className="glass rounded-[2rem] p-8 border-primary/20 animate-slide-up delay-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <BrainCircuit className="w-32 h-32 text-primary" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-primary/20 p-2 rounded-xl">
                <BrainCircuit className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Coach Insights</h2>
            </div>
            
            {recLoading ? (
              <div className="flex items-center gap-3 text-zinc-400 py-4">
                <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
                <p className="text-sm font-medium">FitTrack AI is evaluating your intensity...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendations.length > 0 ? recommendations.map((rec, i) => (
                  <div key={i} className="bg-white/[0.02] border border-white/[0.05] p-4 rounded-2xl flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm leading-relaxed text-zinc-300 font-medium">{rec}</p>
                  </div>
                )) : (
                  <p className="text-zinc-500 text-sm">Logging entries will unlock deeper coaching analysis.</p>
                )}
              </div>
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* Detailed Logger */}
          <section className="lg:col-span-3 glass rounded-[2rem] p-8 animate-slide-up delay-400">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-zinc-800 p-2 rounded-xl">
                  <Dumbbell className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">Log Set</h2>
              </div>
              {logStep === "sets" && (
                <button 
                  onClick={() => setLogStep("exercise")}
                  className="text-xs font-bold text-primary uppercase border border-primary/20 px-3 py-1.5 rounded-full hover:bg-primary/10 transition"
                >
                  Change Exercise
                </button>
              )}
            </div>

            {logStep === "exercise" ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {EXERCISE_DATABASE.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => {
                        setCurrentLog({ ...currentLog, exercise: ex });
                        setLogStep("sets");
                      }}
                      className="p-4 rounded-2xl border border-white/[0.05] bg-white/[0.01] hover:bg-primary/5 hover:border-primary/20 transition-all text-sm font-semibold text-zinc-300 text-left"
                    >
                      {ex}
                    </button>
                  ))}
                  <div className="p-4 rounded-2xl border border-dashed border-white/10 flex items-center justify-center">
                    <span className="text-xs text-zinc-500 font-medium">Custom Exercise...</span>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 mb-6">
                  <p className="text-xs text-primary font-bold uppercase tracking-widest mb-1">Target Exercise</p>
                  <p className="text-lg font-bold">{currentLog.exercise}</p>
                </div>

                <div className="space-y-4">
                  {currentLog.sets.map((set, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-4 items-end animate-slide-up">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest px-1">Weight (kg)</label>
                        <input
                          type="number"
                          placeholder="80"
                          value={set.weight_kg}
                          onChange={(e) => handleSetChange(idx, "weight_kg", e.target.value)}
                          className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest px-1">Reps</label>
                        <input
                          type="number"
                          placeholder="5"
                          value={set.reps}
                          onChange={(e) => handleSetChange(idx, "reps", e.target.value)}
                          className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest px-1">RPE</label>
                        <input
                          type="number"
                          placeholder="8"
                          min="1"
                          max="10"
                          value={set.rpe}
                          onChange={(e) => handleSetChange(idx, "rpe", e.target.value)}
                          className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={handleAddSet}
                    className="flex-1 py-4 rounded-2xl border border-white/10 font-bold text-sm hover:bg-white/5 transition flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Set
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] py-4 rounded-2xl bg-primary text-zinc-950 font-bold text-sm hover:opacity-90 transition shadow-lg shadow-primary/20"
                  >
                    Confirm & Analysis
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* History / Timeline */}
          <section className="lg:col-span-2 glass rounded-[2rem] p-8 animate-slide-up delay-500 h-[600px] flex flex-col">
            <h2 className="text-xl font-bold tracking-tight mb-8">Performance History</h2>
            
            <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
              {workouts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-600 grayscale">
                  <AlertCircle className="w-12 h-12 mb-4" />
                  <p className="text-sm font-medium">History empty. Log a set to start tracking trends.</p>
                </div>
              ) : [...workouts].reverse().map((w, i) => (
                <div key={i} className="relative pl-6 border-l border-white/10 pb-2">
                  <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-primary/40 border border-primary" />
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{w.date}</span>
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded shadow-sm uppercase tracking-widest">
                        {calculate1RM(w.sets[0]?.weight_kg, w.sets[0]?.reps)}kg Max
                      </span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/[0.05] p-3 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold">{w.exercise}</p>
                        <p className="text-[10px] text-zinc-500 font-medium">
                          {w.sets.length} sets • Avg {Math.round(w.sets.reduce((a, b) => a + Number(b.weight_kg), 0) / w.sets.length)}kg
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-700" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}

export default App;