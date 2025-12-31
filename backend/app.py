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
@jwt_required()
def log_workout():
    user_id = get_jwt_identity()
    data = request.json

    workout = {
        "user_id": user_id,
        "date": data["date"],
        "workout_type": data["workout_type"],
        "exercises": data.get("exercises", []),
        "duration_minutes": data["duration_minutes"]
    }

    workouts_collection.insert_one(workout)
    return success_response("Workout logged")

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


MUSCLE_GROUPS = {
    "Bench Press": "chest",
    "Push Ups": "chest",
    "Squats": "legs",
    "Deadlift": "back",
    "Pull Ups": "back",
    "Bicep Curl": "arms",
    "Tricep Dips": "arms",
    "Shoulder Press": "shoulders"
}
def analyze_workouts(workouts):
    analysis = []

    total_workouts = len(workouts)

    if total_workouts == 0:
        analysis.append("No workouts logged yet. Start training to get recommendations.")
        return analysis

    if total_workouts < 3:
        analysis.append("Low workout consistency. Aim for at least 3 workouts per week.")

    total_duration = sum(w["duration_minutes"] for w in workouts)
    avg_duration = total_duration / total_workouts

    if avg_duration < 30:
        analysis.append("Your workout duration is low. Aim for 45–60 minutes per session.")

    if avg_duration > 90:
        analysis.append("You may be overtraining. Consider adding rest days.")

    # Muscle group balance
    muscle_count = {}

    for workout in workouts:
        for ex in workout.get("exercises", []):
            muscle = MUSCLE_GROUPS.get(ex["name"])
            if muscle:
                muscle_count[muscle] = muscle_count.get(muscle, 0) + 1

    if muscle_count:
        min_muscle = min(muscle_count, key=muscle_count.get)
        max_muscle = max(muscle_count, key=muscle_count.get)

        if muscle_count[max_muscle] >= 2 * muscle_count[min_muscle]:
            analysis.append(
                f"Training imbalance detected. You focus more on {max_muscle} than {min_muscle}."
            )

    return analysis

@app.route("/ai/recommendations/<username>", methods=["GET"])
def ai_recommendations(username):
    try:
        workouts = list(workouts_collection.find(
            {"user_name": username},
            {"_id": 0}
        ))

        recommendations = analyze_workouts(workouts)

        # AI performance score calculation
        score = 100
        total_workouts = len(workouts)

        if total_workouts < 3:
            score -= 30

        if total_workouts > 0:
            total_duration = sum(w["duration_minutes"] for w in workouts)
            avg_duration = total_duration / total_workouts

            if avg_duration < 30:
                score -= 20
            elif avg_duration > 90:
                score -= 10

        score = max(score, 0)

        return success_response({
            "user": username,
            "score": score,
            "recommendations": recommendations
        })

    except Exception as e:
        return error_response("AI processing failed", 500)

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