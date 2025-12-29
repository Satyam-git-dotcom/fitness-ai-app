from flask import Flask, jsonify, request
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import certifi

load_dotenv()

app = Flask(__name__)

# MongoDB connection
mongo_uri = os.getenv("MONGO_URI")

client = MongoClient(
    mongo_uri,
    tlsCAFile=certifi.where()
)
db = client["fitness_db"]
users_collection = db["users"]
workouts_collection = db["workouts"]

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "OK", "db": "connected"})

@app.route("/workout", methods=["POST"])
def log_workout():
    data = request.json

    workout = {
        "user_name": data.get("user_name"),
        "date": data.get("date"),
        "workout_type": data.get("workout_type"),
        "exercises": data.get("exercises"),
        "duration_minutes": data.get("duration_minutes")
    }

    workouts_collection.insert_one(workout)

    return jsonify({"message": "Workout logged successfully"}), 201

@app.route("/workouts/<username>", methods=["GET"])
def get_user_workouts(username):
    workouts = list(workouts_collection.find(
        {"user_name": username},
        {"_id": 0}
    ))

    return jsonify({
        "total_workouts": len(workouts),
        "workouts": workouts
    })

def analyze_workouts(workouts):
    analysis = []

    total_workouts = len(workouts)

    if total_workouts == 0:
        analysis.append("No workouts logged yet. Start training to get recommendations.")
        return analysis

    if total_workouts < 3:
        analysis.append("Low workout consistency. Aim for at least 3 workouts per week.")

    avg_duration = sum(w["duration_minutes"] for w in workouts) / total_workouts

    if avg_duration < 30:
        analysis.append("Your workout duration is low. Consider training for 45–60 minutes.")

    if avg_duration > 90:
        analysis.append("You may be overtraining. Ensure proper recovery.")

    return analysis

@app.route("/ai/recommendations/<username>", methods=["GET"])
def ai_recommendations(username):
    workouts = list(workouts_collection.find(
        {"user_name": username},
        {"_id": 0}
    ))

    recommendations = analyze_workouts(workouts)

    return jsonify({
        "user": username,
        "recommendations": recommendations
    })


if __name__ == "__main__":
    app.run(debug=True)