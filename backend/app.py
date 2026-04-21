from flask_cors import CORS
from flask import Flask, jsonify, request
from pymongo import MongoClient
from dotenv import load_dotenv
from bson import ObjectId
import os
import certifi
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
import bcrypt
from datetime import timedelta

load_dotenv()

app = Flask(__name__)
CORS(app)

app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET", "super-secret-key")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)

jwt = JWTManager(app)

# MongoDB connection
mongo_uri = os.getenv("MONGO_URI")

client = MongoClient(
    mongo_uri,
    tlsCAFile=certifi.where()
)
db = client["fitness_db"]
users_collection = db["users"]
workouts_collection = db["workouts"]

def success_response(data=None, message="Success"):
    return jsonify({
        "success": True,
        "message": message,
        "data": data
    })

def error_response(message="Error", status_code=400):
    return jsonify({
        "success": False,
        "message": message,
        "data": None
    }), status_code


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "OK", "db": "connected"})

@app.route("/auth/signup", methods=["POST"])
def signup():
    data = request.json

    required = ["username", "email", "password"]
    for field in required:
        if field not in data:
            return error_response(f"Missing {field}")

    if users_collection.find_one({"email": data["email"]}):
        return error_response("User already exists")

    hashed_pw = bcrypt.hashpw(
        data["password"].encode("utf-8"),
        bcrypt.gensalt()
    )

    user = {
        "username": data["username"],
        "email": data["email"],
        "password": hashed_pw,
        "created_at": datetime.utcnow()
    }

    users_collection.insert_one(user)

    return success_response(message="User registered successfully")

@app.route("/auth/login", methods=["POST"])
def login():
    data = request.json

    user = users_collection.find_one({"email": data.get("email")})
    if not user:
        return error_response("Invalid credentials", 401)

    if not bcrypt.checkpw(
        data["password"].encode("utf-8"),
        user["password"]
    ):
        return error_response("Invalid credentials", 401)

    token = create_access_token(identity=str(user["_id"]))

    return success_response({
        "token": token,
        "username": user["username"]
    })

@app.route("/workout", methods=["POST"])
def log_workout():
    data = request.json
    
    # Support both JWT and body for user identification during transition
    user_name = data.get("user_name", "Satyam")
    
    workout = {
        "user_name": user_name,
        "date": data.get("date", datetime.now().strftime("%Y-%m-%d")),
        "exercise": data.get("exercise"),
        "sets": data.get("sets", []), # List of {weight_kg, reps, rpe}
        "muscle_group": data.get("muscle_group"),
        "created_at": datetime.utcnow()
    }

    if not workout["exercise"] or not workout["sets"]:
        return error_response("Missing exercise or sets")

    workouts_collection.insert_one(workout)
    return success_response(message="Workout logged - FitTrack AI analyzing...")

@app.route("/user", methods=["POST"])
def create_or_update_user():
    data = request.json

    required_fields = ["user_name", "age", "height_cm", "weight_kg", "goal"]

    for field in required_fields:
        if field not in data:
            return error_response(f"Missing field: {field}")

    user = {
        "user_name": data["user_name"],
        "age": data["age"],
        "height_cm": data["height_cm"],
        "weight_kg": data["weight_kg"],
        "goal": data["goal"],
        "experience_level": data.get("experience_level", "beginner")
    }

    users_collection.update_one(
        {"user_name": data["user_name"]},
        {"$set": user},
        upsert=True
    )

    return success_response(user, "User profile saved")

# @app.route("/workout", methods=["POST"])
# def log_workout():
#     data = request.json

#     required_fields = ["user_name", "workout_name", "date", "exercises"]

#     for field in required_fields:
#         if field not in data or data[field] is None:
#             return error_response(f"Missing required field: {field}")

#     if not isinstance(data["exercises"], list) or len(data["exercises"]) == 0:
#         return error_response("Exercises must be a non-empty list")

#     validated_exercises = []

#     for ex in data["exercises"]:
#         if not all(k in ex for k in ("name", "sets", "reps")):
#             return error_response(
#                 "Each exercise must have name, sets, and reps"
#             )

#         validated_exercises.append({
#             "name": ex["name"],
#             "sets": int(ex["sets"]),
#             "reps": int(ex["reps"]),
#             "weight": ex.get("weight")
#         })

#     workout = {
#         "user_name": data["user_name"],
#         "workout_name": data["workout_name"],
#         "date": data["date"],
#         "exercises": validated_exercises,
#         "created_at": datetime.utcnow()
#     }

#     workouts_collection.insert_one(workout)

#     return success_response(message="Workout logged successfully")

@app.route("/workout/<workout_id>", methods=["DELETE"])
def delete_workout(workout_id):
    try:
        result = workouts_collection.delete_one(
            {"_id": ObjectId(workout_id)}
        )

        if result.deleted_count == 0:
            return error_response("Workout not found", 404)

        return success_response(message="Workout deleted successfully")

    except Exception as e:
        return error_response("Invalid workout ID", 400)

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


def calculate_1rm(weight, reps):
    if reps == 1: return weight
    if reps <= 0: return 0
    # Epley Formula: Weight * (1 + Reps/30)
    return round(weight * (1 + reps / 30), 1)

def analyze_workouts(workouts):
    analysis = []
    
    if not workouts:
        analysis.append("FitTrack AI is ready. Log your first set to begin coaching.")
        return analysis

    # Group by date for session analysis
    # For simplicity, we'll look at the last session vs previous session
    workouts_sorted = sorted(workouts, key=lambda x: x.get('date', ''), reverse=True)
    latest_workout = workouts_sorted[0]
    
    # Volume analysis
    def get_session_volume(w_list):
        vol = 0
        for w in w_list:
            for s in w.get("sets", []):
                vol += (s.get("weight_kg", 0) * s.get("reps", 0))
        return vol

    # This logic assumes workouts are grouped by session date
    # Let's simplify and just look at the latest exercise log vs previous logs of same exercise
    latest_exercise = latest_workout.get("exercise")
    previous_logs = [w for w in workouts_sorted[1:] if w.get("exercise") == latest_exercise]
    
    if latest_workout.get("sets"):
        # Calculate max 1RM for latest session
        latest_max_1rm = max([calculate_1rm(s.get("weight_kg", 0), s.get("reps", 0)) for s in latest_workout["sets"]])
        
        if previous_logs:
            prev_max_1rm = max([calculate_1rm(s.get("weight_kg", 0), s.get("reps", 0)) for p in previous_logs for s in p.get("sets", [])])
            if latest_max_1rm > prev_max_1rm:
                analysis.append(f"PR BROKEN! Your estimated 1RM for {latest_exercise} is now {latest_max_1rm}kg (Up from {prev_max_1rm}kg).")
            elif latest_max_1rm == prev_max_1rm:
                analysis.append(f"Consistent power on {latest_exercise}. Try adding 1.25kg next session for progressive overload.")
            else:
                analysis.append(f"Solid effort on {latest_exercise}. Focus on recovery today.")
        else:
            analysis.append(f"First time logging {latest_exercise}. Baseline 1RM established at {latest_max_1rm}kg.")

    # General frequency tips
    total_workouts = len(workouts)
    if total_workouts < 3:
        analysis.append("Training frequency is low. Aim for at least 3 sessions per week to trigger hypertrophy.")

    return analysis

@app.route("/ai/recommendations/<username>", methods=["GET"])
def ai_recommendations(username):
    try:
        workouts = list(workouts_collection.find(
            {"user_name": username},
            {"_id": 0}
        ))

        recommendations = analyze_workouts(workouts)

        # AI performance score calculation based on consistency and progressive overload
        score = 100
        if not workouts:
            score = 0
        else:
            # Simple score logic: more logs = higher score, capped at 100
            score = min(100, len(workouts) * 5 + 30)
            
            # Check for recent activity
            last_date = datetime.strptime(workouts[-1]["date"], "%Y-%m-%d")
            if (datetime.now() - last_date).days > 4:
                score -= 20

        score = max(0, score)

        return success_response({
            "user": username,
            "score": score,
            "recommendations": recommendations,
            "persona": "FitTrack AI"
        })

    except Exception as e:
        print(f"AI Error: {e}")
        return error_response("FitTrack AI analysis failed", 500)

from datetime import datetime, timedelta

@app.route("/api/v1/analytics/weekly/<username>", methods=["GET"])
def weekly_analytics(username):
    seven_days_ago = datetime.now() - timedelta(days=7)

    workouts = list(workouts_collection.find(
        {
            "user_name": username,
            "date": {"$gte": seven_days_ago.strftime("%Y-%m-%d")}
        },
        {"_id": 0}
    ))

    total_workouts = len(workouts)
    total_minutes = sum(w["duration_minutes"] for w in workouts) if workouts else 0
    avg_duration = total_minutes / total_workouts if total_workouts else 0

    status = "Good progress"
    if total_workouts < 3:
        status = "Low activity"
    elif avg_duration < 30:
        status = "Workouts too short"

    return jsonify({
        "user": username,
        "weekly_workouts": total_workouts,
        "total_minutes": total_minutes,
        "average_duration": round(avg_duration, 1),
        "status": status
    })

if __name__ == "__main__":
    app.run(debug=True)