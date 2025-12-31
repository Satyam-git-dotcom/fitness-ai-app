import { useEffect, useState } from "react";
const API_BASE = import.meta.env.VITE_API_BASE;
const getAiScoreStyles = (score) => {
  if (score === null) return "bg-zinc-700 text-zinc-300";

  if (score >= 75)
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

  if (score >= 50)
    return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";

  return "bg-red-500/10 text-red-400 border-red-500/20";
};
function App() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [recLoading, setRecLoading] = useState(true);
  const [aiScore, setAiScore] = useState(null);
  const [formData, setFormData] = useState({
    workout_type: "",
    duration_minutes: "",
    date: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetch(`${API_BASE}/workout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_name: "Satyam",
        workout_type: formData.workout_type,
        duration_minutes: Number(formData.duration_minutes),
        date: formData.date,
      }),
    })
      .then((res) => res.json())
      .then(() => fetch(`${API_BASE}/workouts/Satyam`))
      .then((res) => res.json())
      .then((data) => {
        setWorkouts(data.workouts || []);
        fetchRecommendations();
        setFormData({ workout_type: "", duration_minutes: "", date: "" });
      });
  };

  const fetchRecommendations = () => {
    setRecLoading(true);
    fetch(`${API_BASE}/ai/recommendations/Satyam`)
      .then((res) => res.json())
      .then((data) => {
        setRecommendations(data.data?.recommendations || []);
        setAiScore(data.data?.score ?? null);
        setRecLoading(false);
      })
      .catch(() => setRecLoading(false));
  };

  useEffect(() => {
    fetch(`${API_BASE}/workouts/Satyam`)
      .then((res) => res.json())
      .then((data) => {
        setWorkouts(data.workouts || []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      <header className="border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Welcome, <span className="text-primary">Satyam</span></h1>
          <p className="text-zinc-400">Your AI-powered fitness dashboard</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-10">
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-800 rounded-xl p-4 sm:p-5 border border-zinc-700">
            <p className="text-sm text-zinc-400">Total Workouts</p>
            <p className="text-3xl font-bold mt-1">{workouts.length}</p>
          </div>
          <div className="bg-zinc-800 rounded-xl p-4 sm:p-5 border border-zinc-700">
            <p className="text-sm text-zinc-400">Avg Duration</p>
            <p className="text-3xl font-bold mt-1">{workouts.length ? Math.round(workouts.reduce((a, b) => a + b.duration_minutes, 0) / workouts.length) : 0} min</p>
          </div>
          <div className="bg-zinc-800 rounded-xl p-4 sm:p-5 border border-zinc-700">
            <p className="text-sm text-zinc-400">AI Score</p>
            <p className="text-3xl font-bold mt-1 text-primary">{aiScore ?? "--"}</p>
          </div>
        </section>

        <section className="bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl p-6 border border-zinc-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              🧠 AI Coach
            </h2>

            {aiScore !== null && (
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold border ${getAiScoreStyles(
                  aiScore
                )}`}
              >
                AI Score: {aiScore}/100
              </span>
            )}
          </div>

          {recLoading && (
            <div className="text-zinc-400 animate-pulse">
              🤖 AI is analyzing your workouts...
            </div>
          )}

          {!recLoading && recommendations.length === 0 && (
            <p className="text-zinc-400">
              Log more workouts to unlock personalized AI insights.
            </p>
          )}

          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <div
                key={i}
                className="bg-zinc-900 border border-zinc-700 rounded-lg p-4"
              >
                <p className="text-sm leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-zinc-800 rounded-xl p-6 border border-zinc-700">
          <h2 className="text-xl font-semibold mb-6">➕ Log a Workout</h2>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Workout Type */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-zinc-400">Workout Type</label>
              <input
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
                type="text"
                name="workout_type"
                placeholder="e.g. Strength, Cardio"
                value={formData.workout_type}
                onChange={handleChange}
                required
              />
            </div>

            {/* Duration */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-zinc-400">Duration (minutes)</label>
              <input
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
                type="number"
                name="duration_minutes"
                placeholder="e.g. 45"
                value={formData.duration_minutes}
                onChange={handleChange}
                required
              />
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-zinc-400">Workout Date</label>
              <input
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>

            {/* Submit */}
            <div className="md:col-span-3">
              <button
                type="submit"
                className="w-full bg-primary text-black font-semibold py-3 rounded-lg hover:opacity-90 transition"
              >
                Add Workout
              </button>
            </div>
          </form>
        </section>

        <section className="bg-zinc-800 rounded-xl p-6 border border-zinc-700">
          <h2 className="text-xl font-semibold mb-4">🏋️ Workout History</h2>

          {workouts.length === 0 && (
            <p className="text-zinc-400">No workouts logged yet.</p>
          )}

          <div className="space-y-4">
            {workouts.map((w, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-zinc-900 rounded-lg px-5 py-4 border border-zinc-700"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {w.workout_type}
                    </span>
                  </div>
                  <span className="text-sm text-zinc-400">{w.date}</span>
                </div>

                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-primary/10 text-primary border border-primary/20 w-fit">
                  {w.duration_minutes} min
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;