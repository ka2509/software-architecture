import psutil
import docker
import requests
from flask import Flask, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
import json
import time
import redis
# Khởi tạo Flask và SocketIO
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Allow frontend origin
socketio = SocketIO(app, cors_allowed_origins="*")  # Specify allowed origin
#biến để làm việc với docker
client = docker.from_env()
# Kết nối Redis
redis_client = redis.StrictRedis(host='localhost', port=6379, db=0, decode_responses=True)
# Hàm gửi thông tin hệ thống theo chu kỳ
def send_system_resources():
    while True:
        disk_io = psutil.disk_io_counters()
        net_io = psutil.net_io_counters()
        data = {
            "cpu_usage": psutil.cpu_percent(interval=1),
            "memory_usage": psutil.virtual_memory().percent,
            "disk_read": disk_io.read_bytes,
            "disk_write": disk_io.write_bytes,
            "data_sent": net_io.bytes_sent,
            "data_recv": net_io.bytes_recv
        }
        socketio.emit("system_resources", data)
        time.sleep(1)
# Hàm lấy ra host port từ tên của container để phục vụ cho các api cần gọi đến localhost khác
def get_container_host_port(container_name):
    """
    Lấy host port từ container name.
    :param container_name: Tên của container
    :return: Host port (chuỗi) nếu tồn tại, hoặc thông báo lỗi
    """
    try:
        # Lấy container object theo tên
        container = client.containers.get(container_name)
        
        # Lấy thông tin các cổng được ánh xạ
        ports = container.attrs['NetworkSettings']['Ports']
        
        # Lấy host port từ danh sách cổng
        for container_port, mappings in ports.items():
            if mappings:  # Nếu có ánh xạ host port
                return mappings[0]['HostPort']  # Trả về giá trị host port đầu tiên
        
        # Nếu không tìm thấy host port
        return jsonify({"error": f"No host port found for container '{container_name}'"}), 404
    except docker.errors.NotFound:
        return jsonify({"error": f"Container '{container_name}' not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/connections', methods=['GET'])
def get_active_connections():
    """API để lấy số lượng kết nối hiện tại"""
    try:
        active_connections_gold = int(redis_client.get("active_connections_gold") or 0)
        active_connections_exchange = int(redis_client.get("active_connections_exchange") or 0)
        return jsonify({"active_connections_gold": active_connections_gold,
                        "active_connections_exchange": active_connections_exchange}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Hàm lấy thông tin về các container Docker
def get_docker_containers():
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
        if service_name == "redis":
    # Kiểm tra trạng thái của container
            try:
                container = client.containers.get(service_name)  # Lấy thông tin container theo tên
                container_status = container.attrs["State"]["Status"]  # Trạng thái của container
                
                # Xác định trạng thái Healthy/Unhealthy dựa trên trạng thái container
                if container_status == "running":
                    service_health = {
                        "name": service_name,
                        "status": "Healthy",
                        "ports": port,
                        "message": "Container is running."
                    }
                else:
                    service_health = {
                        "name": service_name,
                        "status": "Unhealthy",
                        "ports": port,
                        "message": "This container is down."
                    }
            except docker.errors.NotFound:
                # Trường hợp không tìm thấy container
                service_health = {
                    "name": service_name,
                    "status": "Unhealthy",
                    "ports": port,
                    "message": "Container not found."
                }
            except Exception as e:
                # Trường hợp lỗi không mong muốn
                service_health = {
                    "name": service_name,
                    "status": "Unhealthy",
                    "ports": port,
                    "message": f"An error occurred: {str(e)}"
                }
        else:
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

# Chạy background task gửi dữ liệu
@socketio.on("connect")
def handle_connect():
    socketio.start_background_task(target=send_system_resources)

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
@app.route('/container-stat/<container_name>', methods=['GET'])
def get_container_stats(container_name):
    try:
        # Lấy thông tin container stats
        container = client.containers.get(container_name)
        stats = container.stats(stream=False)  # Lấy stats không stream
        
        # Tính toán CPU Usage (%)
        delta_total_cpu = stats['cpu_stats']['cpu_usage']['total_usage'] - stats['precpu_stats']['cpu_usage']['total_usage']
        delta_system_cpu = stats['cpu_stats']['system_cpu_usage'] - stats['precpu_stats']['system_cpu_usage']
        online_cpus = stats['cpu_stats']['online_cpus']
        if delta_system_cpu > 0 and online_cpus > 0:
            cpu_usage_percent = (delta_total_cpu / delta_system_cpu) * online_cpus * 100
        else:
            cpu_usage_percent = 0

        # Tính toán Memory Usage (MB) và Memory Limit (MB)
        memory_usage_mb = stats['memory_stats']['usage'] / (1024 * 1024)  # Convert bytes to MB
        memory_limit_mb = stats['memory_stats']['limit'] / (1024 * 1024)  # Convert bytes to MB

        # Tính toán Network I/O (MB)
        network_rx_mb = stats['networks']['eth0']['rx_bytes'] / (1024 * 1024)  # Convert bytes to MB
        network_tx_mb = stats['networks']['eth0']['tx_bytes'] / (1024 * 1024)  # Convert bytes to MB

        # Trả về các thuộc tính cần thiết cho frontend
        return jsonify({
            'cpu_usage_percent': cpu_usage_percent,
            'memory_usage_mb': memory_usage_mb,
            'memory_limit_mb': memory_limit_mb,
            'network_rx_mb': network_rx_mb,
            'network_tx_mb': network_tx_mb,
        })
    except Exception as e:
        # Trả về lỗi nếu xảy ra vấn đề
        return jsonify({'error': str(e)}), 500


@app.route('/container-id/<container_name>', methods=['GET'])
def get_container_id(container_name):
    try:
        # Lấy danh sách tất cả các container
        containers = client.containers.list(all=True)
        
        # Tìm container theo tên
        for container in containers:
            if container_name in container.name:  # So sánh tên container
                return jsonify({'container_name': container.name, 'container_id': container.id})
        
        # Nếu không tìm thấy
        return jsonify({'error': f'Container with name "{container_name}" not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/container-traffic/<container_name>', methods=['GET'])
def get_container_traffic(container_name):
    """
    API nhận tên container, lấy host port và gọi API /traffic trên container đó.
    """
    try:
        # Lấy host port của container
        host_port = get_container_host_port(container_name)

        # Kiểm tra nếu không có cổng nào được ánh xạ
        if not host_port:
            return jsonify({"error": f"No ports mapped for container '{container_name}'"}), 400

        # Gọi API /traffic trên host port đã lấy (sử dụng 127.0.0.1)
        url = f"http://127.0.0.1:{host_port}/traffic"
        response = requests.get(url)

        # Kiểm tra nếu response không trả về thành công
        if response.status_code != 200:
            return jsonify({"error": f"Failed to fetch traffic data from {url}. Status code: {response.status_code}"}), response.status_code

        # Kiểm tra nếu nội dung không phải JSON
        try:
            traffic_data = response.json()
        except ValueError:
            return jsonify({"error": f"Invalid JSON response from {url}. Content: {response.text}"}), 500

        # Truy cập trực tiếp vào giá trị của 'traffic_data' nếu tồn tại
        traffic_data_cleaned = traffic_data.get("traffic_data", {})

        # Trả về kết quả từ API /traffic
        return jsonify({
            "container_name": container_name,
            "host_port": host_port,
            "traffic_data": traffic_data_cleaned
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Failed to connect to traffic API on port {host_port}. {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Chạy Flask app với WebSocket
if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5002, debug=True, allow_unsafe_werkzeug=True)
