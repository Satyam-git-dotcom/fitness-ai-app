import { useEffect, useState } from "react";

function App() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    workout_type: "",
    duration_minutes: "",
    date: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };
  const handleSubmit = (e) => {
    e.preventDefault();

    fetch("http://127.0.0.1:5000/workout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_name: "Satyam",
        workout_type: formData.workout_type,
        duration_minutes: Number(formData.duration_minutes),
        date: formData.date,
      }),
    })
      .then((res) => res.json())
      .then(() => {
        return fetch("http://127.0.0.1:5000/workouts/Satyam");
      })
      .then((res) => res.json())
      .then((data) => {
        setWorkouts(data.workouts || []);
        setFormData({
          workout_type: "",
          duration_minutes: "",
          date: "",
        });
      })
      .catch((err) => console.error(err));
  };
  useEffect(() => {
    fetch("http://127.0.0.1:5000/workouts/Satyam")
      .then((res) => res.json())
      .then((data) => {
        console.log("API DATA:", data);
        setWorkouts(data.workouts || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <h2>Loading workouts...</h2>;

  return (
    <div style={{ padding: "20px" }}>

      <h2>Log Workout</h2>

      <form onSubmit={handleSubmit} style={{ marginBottom: "30px" }}>
        <input
          type="text"
          name="workout_type"
          placeholder="Workout Type"
          value={formData.workout_type}
          onChange={handleChange}
          required
        />
        <br />

        <input
          type="number"
          name="duration_minutes"
          placeholder="Duration (minutes)"
          value={formData.duration_minutes}
          onChange={handleChange}
          required
        />
        <br />

        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          required
        />
        <br />

        <button type="submit">Add Workout</button>
      </form>

      <h1>My Workouts</h1>

      {workouts.length === 0 && <p>No workouts logged.</p>}

      {workouts.map((w, index) => (
        <div key={index} style={{ marginBottom: "15px" }}>
          <strong>{w.workout_type}</strong> – {w.duration_minutes} mins
          <br />
          Date: {w.date}
        </div>
      ))}
    </div>
  );
}

export default App;