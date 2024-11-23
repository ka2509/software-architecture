import time
from flask import Flask, jsonify, render_template, request
from flask_socketio import SocketIO
import requests
import xml.etree.ElementTree as ET
from pymongo import MongoClient
from datetime import datetime, timezone
from pymongo.server_api import ServerApi
from threading import Lock
import redis
app = Flask(__name__)

# URL API Vietcombank
VCB_API_URL = "https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx"
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
    """Hàm ghi nhận lưu lượng truy cập chỉ cho endpoint 'get_exchange_rate'"""
    global traffic_data
    if endpoint == "get_exchange_rate":  # Chỉ ghi nhận nếu endpoint là 'get_exchange_rate'
        with lock:
            current_time = int(time.time())  # Lấy thời gian hiện tại (Unix timestamp)
            if endpoint not in traffic_data:
                traffic_data[endpoint] = {}
            if current_time not in traffic_data[endpoint]:
                traffic_data[endpoint][current_time] = 0
            traffic_data[endpoint][current_time] += 1

@app.before_request
def track_traffic():
    """Theo dõi và ghi nhận traffic nếu endpoint là 'get_exchange_rate'"""
    endpoint = request.endpoint
    if endpoint == "get_exchange_rate":  # Chỉ ghi nhận traffic cho 'get_exchange_rate'
        record_traffic(endpoint)

@app.route("/traffic", methods=["GET"])
def get_traffic():
    """API trả về lưu lượng truy cập chỉ cho endpoint 'get_exchange_rate'"""
    with lock:
        # Lọc dữ liệu chỉ lấy endpoint 'get_exchange_rate'
        cleaned_data = traffic_data.get("get_exchange_rate", {})  # Mặc định trả về {} nếu không có dữ liệu
        return jsonify({"traffic_data": cleaned_data})



@app.route('/')
def index():
    return render_template('index.html')

@app.route('/exchange-rate', methods=['GET'])
def get_exchange_rate():
    save_to_db = request.args.get('save_to_db', 'false').lower() == 'true'  # Kiểm tra tham số từ frontend

    try:
        # Gọi API từ Vietcombank
        response = requests.get(VCB_API_URL)
        
        # Kiểm tra nếu API trả về thành công (HTTP status 200)
        if response.status_code == 200:
            # Phân tích dữ liệu XML
            root = ET.fromstring(response.content)
            exchange_rates = []

            # Lấy thông tin tỷ giá từ XML
            for exrate in root.findall('Exrate'):
                rate_info = {
                    "CurrencyCode": exrate.get('CurrencyCode'),
                    "CurrencyName": exrate.get('CurrencyName').strip(),
                    "Buy": exrate.get('Buy'),
                    "Transfer": exrate.get('Transfer'),
                    "Sell": exrate.get('Sell'),
                }
                exchange_rates.append(rate_info)

            # Nếu tham số save_to_db là true, lưu vào database
            if save_to_db:
                # Lưu dữ liệu vào MongoDB cùng thời gian request
                data_to_store = {
                    "timestamp": datetime.now(timezone.utc),
                    "exchange_rates": exchange_rates
                }
                collection.insert_one(data_to_store)

            return jsonify({"status": "success", "data": exchange_rates}), 200
        else:
            return jsonify({"status": "error", "message": "Không thể lấy dữ liệu từ Vietcombank"}), response.status_code
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/health', methods=['GET'])
def health_check():
    health_status = {"status": "Healthy", "checks": []}
    total_response_time = 0

    # Check MongoDB connection
    try:
        start_time = datetime.now()
        client.admin.command('ping')  # Simple MongoDB ping to test connection
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
        
    # Check Exchange Rate API endpoint
    try:
        start_time = datetime.now()
        response = requests.get("http://localhost:5001/exchange-rate", timeout=5) 
        response_time = (datetime.now() - start_time).microseconds // 1000
        total_response_time += response_time
        if response.status_code == 200:
            health_status["checks"].append({
                "name": "Exchange Rate API",
                "status": "Healthy",
                "responseTime": f"{response_time}ms"
            })
        else:
            # Kiểm tra nếu response có thuộc tính "message", nếu có thì lấy nó
            error_message = response.json().get('message', f"HTTP {response.status_code}")
            health_status["checks"].append({
                "name": "Exchange Rate API",
                "status": "Unhealthy",
                "responseTime": f"{response_time}ms",
                "error": error_message  # Lấy message lỗi nếu có
            })
            health_status["status"] = "Unhealthy"
    except Exception as e:
        health_status["checks"].append({
            "name": "Exchange Rate API",
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
        redis_client.incr("active_connections_exchange")
    print(f"Client connected. Total active connections: {redis_client.get('active_connections_exchange')}")
    
@socketio.on('disconnect')
def handle_disconnect():
    """Xử lý khi một client ngắt kết nối"""
    with lock1:
        # Giảm số lượng kết nối trong Redis
        redis_client.decr("active_connections_exchange")
    print(f"Client disconnected. Total active connections: {redis_client.get('active_connections_exchange')}")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)
