# Bước 1: Chọn image cơ sở
FROM python:3.9-slim

# Bước 2: Đặt thư mục làm việc
WORKDIR /app

# Bước 3: Sao chép requirements.txt và cài đặt các thư viện cần thiết
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Bước 4: Sao chép toàn bộ mã nguồn vào container
COPY . .

# Bước 5: Mở cổng cho ứng dụng
EXPOSE 5000

# Bước 6: Chạy ứng dụng Flask
CMD ["python", "gold_api.py"]
