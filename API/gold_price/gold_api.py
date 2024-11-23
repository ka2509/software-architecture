from threading import Lock
import time
from flask import Flask, jsonify, render_template, request
from flask_socketio import SocketIO
import redis
import requests
from pymongo import MongoClient
from datetime import datetime, timezone
from pymongo.server_api import ServerApi
app = Flask(__name__)

# URL API BTMC
BTMC_API_URL = "http://api.btmc.vn/api/BTMCAPI/getpricebtmc?key=3kd8ub1llcg9t45hnoh8hmn7t5kc2v"
#MongoDB Cluster URL
MONGO_URI = "mongodb+srv://0582250903:eocopas123@cluster0.rinos.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
# Connect to MongoDB
client = MongoClient(MONGO_URI, server_api=ServerApi('1'))
db = client["Health_Endpoint_Monitoring"]  # Database name
collection = db["History_Request"]  # Collection name
# Biến lưu trữ lưu lượng truy cập
traffic_data = {}
lock = Lock()

socketio = SocketIO(app, cors_allowed_origins="*")
# Kết nối Redis
redis_client = redis.StrictRedis(host='localhost', port=6379, db=0, decode_responses=True)
lock1 = Lock()

def record_traffic(endpoint):
    """Hàm ghi nhận lưu lượng truy cập chỉ cho endpoint 'get_gold_price'"""
    global traffic_data
    if endpoint == "get_gold_price":  # Chỉ ghi nhận nếu endpoint là 'get_gold_price'
        with lock:
            current_time = int(time.time())  # Lấy thời gian hiện tại (Unix timestamp)
            if endpoint not in traffic_data:
                traffic_data[endpoint] = {}
            if current_time not in traffic_data[endpoint]:
                traffic_data[endpoint][current_time] = 0
            traffic_data[endpoint][current_time] += 1

@app.before_request
def track_traffic():
    """Theo dõi và ghi nhận traffic nếu endpoint là 'get_gold_price'"""
    endpoint = request.endpoint
    print(f"Request endpoint: {endpoint}")  # Log để kiểm tra endpoint
    if endpoint == "get_gold_price":  # Chỉ ghi nhận traffic cho 'get_gold_price'
        record_traffic(endpoint)

@app.route("/traffic", methods=["GET"])
def get_traffic():
    """API trả về lưu lượng truy cập chỉ cho endpoint 'get_gold_price'"""
    with lock:
        # Lọc dữ liệu chỉ lấy endpoint 'get_gold_price'
        cleaned_data = traffic_data.get("get_gold_price", {})  # Mặc định trả về {} nếu không có dữ liệu
        return jsonify({"traffic_data": cleaned_data})


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/gold-price', methods=['GET'])
def get_gold_price():
    
    save_to_db = request.args.get('save_to_db', 'false').lower() == 'true'  # Kiểm tra tham số từ frontend
    try:
        # Call BTMC API
        response = requests.get(BTMC_API_URL)
        if response.status_code == 200:
            data = response.json()  # Parse JSON response

            # Nếu tham số save_to_db là true, lưu vào database
            if save_to_db:
                # Save gold price data with timestamp to MongoDB
                document = {
                    "timestamp": datetime.now(timezone.utc),
                    "gold_price": data
                }
                collection.insert_one(document)

            return jsonify({"status": "success", "data": data}), 200
        else:
            return jsonify({"status": "error", "message": "Không thể lấy dữ liệu từ BTMC"}), response.status_code
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    health_status = {"status": "Healthy", "checks": []}
    total_response_time = 0

    # Check MongoDB connection
    try:
        start_time = datetime.now()
        client.admin.command('ping')  # Test MongoDB connection
        response_time = (datetime.now() - start_time).microseconds // 1000
        total_response_time += response_time
        health_status["checks"].append({
            "name": "MongoDB",
            "status": "Healthy",
            "responseTime": f"{response_time}ms"
        })
    except Exception as e:
        health_status["checks"].append({
            "name": "MongoDB",
            "status": "Unhealthy",
            "responseTime": "N/A",
            "error": str(e)
        })
        health_status["status"] = "Unhealthy"

    # Check Gold Price API endpoint
    try:
        start_time = datetime.now()
        response = requests.get("http://localhost:5000/gold-price", timeout=5) 
        response_time = (datetime.now() - start_time).microseconds // 1000
        total_response_time += response_time
        if response.status_code == 200:
            health_status["checks"].append({
                "name": "Gold Price API",
                "status": "Healthy",
                "responseTime": f"{response_time}ms"
            })
        else:
            # Kiểm tra nếu response có thuộc tính "message", nếu có thì lấy nó
            error_message = response.json().get('message', f"HTTP {response.status_code}")
            health_status["checks"].append({
                "name": "Gold Price API",
                "status": "Unhealthy",
                "responseTime": f"{response_time}ms",
                "error": error_message  # Lấy message lỗi nếu có
            })
            health_status["status"] = "Unhealthy"
    except Exception as e:
        health_status["checks"].append({
            "name": "Gold Price API",
            "status": "Unhealthy",
            "responseTime": "N/A",
            "error": str(e)
        })
        health_status["status"] = "Unhealthy"

    # Add total response time
    health_status["totalResponseTime"] = f"{total_response_time}ms"

    # Set HTTP status code
    http_status = 200 if health_status["status"] == "Healthy" else 503
    return jsonify(health_status), http_status

@socketio.on('connect')
def handle_connect():
    """Xử lý khi một client kết nối"""
    with lock1:
        # Tăng số lượng kết nối trong Redis
        redis_client.incr("active_connections_gold")
    print(f"Client connected. Total active connections: {redis_client.get('active_connections_gold')}")
    
@socketio.on('disconnect')
def handle_disconnect():
    """Xử lý khi một client ngắt kết nối"""
    with lock1:
        # Giảm số lượng kết nối trong Redis
        redis_client.decr("active_connections_gold")
    print(f"Client disconnected. Total active connections: {redis_client.get('active_connections_gold')}")
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
