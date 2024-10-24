from flask import Flask, jsonify, render_template
import requests

app = Flask(__name__)

# URL API BTMC
BTMC_API_URL = "http://api.btmc.vn/api/BTMCAPI/getpricebtmc?key=3kd8ub1llcg9t45hnoh8hmn7t5kc2v"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/gold-price', methods=['GET'])
def get_gold_price():
    try:
        # Gọi API từ BTMC
        response = requests.get(BTMC_API_URL)
        if response.status_code == 200:
            data = response.text  # Lấy dữ liệu gốc từ BTMC
            return jsonify({"status": "success", "data": data}), 200
        else:
            return jsonify({"status": "error", "message": "Không thể lấy dữ liệu từ BTMC"}), response.status_code
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
