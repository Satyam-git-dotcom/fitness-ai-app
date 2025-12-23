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

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "OK", "db": "connected"})

@app.route("/register", methods=["POST"])
def register_user():
    data = request.json

    user = {
        "name": data.get("name"),
        "age": data.get("age"),
        "height": data.get("height"),
        "weight": data.get("weight"),
        "goal": data.get("goal")
    }

    users_collection.insert_one(user)

    return jsonify({"message": "User registered successfully"}), 201

if __name__ == "__main__":
    app.run(debug=True)