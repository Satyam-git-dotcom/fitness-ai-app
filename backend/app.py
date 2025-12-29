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

if __name__ == "__main__":
    app.run(debug=True)