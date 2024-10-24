from flask import Flask, jsonify, render_template
import requests
import xml.etree.ElementTree as ET

app = Flask(__name__)

# URL API Vietcombank
VCB_API_URL = "https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx"
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/exchange-rate', methods=['GET'])
def get_exchange_rate():
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

            return jsonify({"status": "success", "data": exchange_rates}), 200
        else:
            return jsonify({"status": "error", "message": "Không thể lấy dữ liệu từ Vietcombank"}), response.status_code
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)