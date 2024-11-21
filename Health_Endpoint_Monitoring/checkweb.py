import psutil
import docker
import requests
from flask import Flask, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
import json
import time

# Khởi tạo Flask và SocketIO
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Allow frontend origin
socketio = SocketIO(app, cors_allowed_origins="*")  # Specify allowed origin

# Hàm lấy thông số tài nguyên của hệ thống
def get_system_resources():
    return {
        "cpu_usage": psutil.cpu_percent(interval=1),
        "memory_usage": psutil.virtual_memory().percent,
        "disk_usage": psutil.disk_usage('/').percent,
        "network": psutil.net_io_counters()._asdict()
    }


# Hàm lấy thông tin về các container Docker
def get_docker_containers():
    client = docker.from_env()
    containers = client.containers.list(all=True)

    container_info_list = []
    for container in containers:
        container_info = {
            'name': container.name,
            'status': container.status,
        }

        # Lấy thông tin Ports từ container
        ports = container.attrs.get('NetworkSettings', {}).get('Ports', {})
        
        host_ports = []
        for port, mappings in ports.items():
            for mapping in mappings:
                host_port = mapping.get('HostPort')
                if host_port:
                    host_ports.append(host_port)
        
        container_info['ports'] = ', '.join(host_ports) if host_ports else 'N/A'

        container_info_list.append(container_info)

    return container_info_list

# Hàm kiểm tra sức khỏe của dịch vụ
def check_health_of_service(service_name, port):
    health_url = f"http://localhost:{port}/health"
    try:
        response = requests.get(health_url, timeout=5)
        health_data = response.json() if response.status_code == 200 else None

        service_health = {
            "name": service_name,
            "status": health_data.get("status", "Unhealthy") if health_data else "Unhealthy",
            "ports": port,
            "checks": health_data.get("checks", []) if health_data else []
        }

        return service_health

    except requests.exceptions.RequestException as e:
        return {
            "name": service_name,
            "status": "Unhealthy",
            "ports": port,
            "error": str(e),
            "checks": []
        }

# WebSocket để gửi tài nguyên hệ thống theo thời gian thực
@socketio.on('connect')
def handle_connect():
    
    print("client has connected")
    while True:
        # Lấy thông tin tài nguyên hệ thống
        resources = get_system_resources()
        # Gửi thông tin tài nguyên qua WebSocket
        socketio.emit('system_resources', resources)
        time.sleep(5)  # Đợi 1 giây trước khi gửi lại thông tin mới
@socketio.on('disconnect')
def disconnected():
    print("User disconnected")
    socketio.emit('disconnect', 'user disconnected')
# API trả về kết quả kiểm tra sức khỏe của các container
@app.route('/health-checks', methods=['GET'])
def health_checks():
    containers = get_docker_containers()
    health_results = []

    for container in containers:
        if container['status'].lower() != 'running':
            health_results.append({
                "name": container['name'],
                "status": "Down",
                "ports": container['ports'],
                "error": "Container is not running"
            })
        else:
            if container['ports']:
                health_result = check_health_of_service(container['name'], container['ports'])
                health_results.append(health_result)
    
    return jsonify({"services": health_results})

# Chạy Flask app với WebSocket
if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5002, debug=True, allow_unsafe_werkzeug=True)
