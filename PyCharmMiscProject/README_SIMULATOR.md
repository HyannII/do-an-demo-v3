# Mô Phỏng Đèn Giao Thông 4 Pha

## Mô Tả

Ứng dụng mô phỏng đèn giao thông 4 pha cho phép người dùng chọn nút giao và chạy mô phỏng theo cấu hình schedule đang active của nút giao đó. Hỗ trợ hoạt động offline với hệ thống cache thông minh.

## Tính Năng Mới

- **Chọn nút giao**: Người dùng có thể nhập tên nút giao hoặc chọn từ danh sách
- **Schedule động**: Ứng dụng sẽ tự động tìm schedule đang active và áp dụng pattern phù hợp
- **Hệ thống cache thông minh**: Lưu cấu hình gần nhất vào file cache và sử dụng khi offline
- **Hoạt động offline**: Tự động fallback từ database → cache → cấu hình minimal
- **Hiển thị nguồn cấu hình**: Màu sắc khác nhau cho database (xanh), cache (cam), minimal (đỏ)
- **Số pha linh hoạt**: Hỗ trợ từ 1-4 pha tùy theo cấu hình thực tế

## Cài Đặt

### 1. Cài đặt dependencies

```bash
pip install pygame psycopg2-binary fastapi uvicorn python-dotenv
```

### 2. Cấu hình database

Tạo file `.env` trong thư mục `PyCharmMiscProject` với nội dung:

```env
DATABASE_URL=postgresql://username:password@host:port/database_name
```

### 3. Kiểm tra kết nối (Tùy chọn)

Trước khi chạy mô phỏng, bạn có thể kiểm tra kết nối database:

```bash
cd PyCharmMiscProject
python test_db_connection.py
```

### 4. Chạy ứng dụng

```bash
cd PyCharmMiscProject
python junction_traffic_light_simulator.py
```

## Cách Sử Dụng

### 1. Chọn nút giao

Khi khởi động, ứng dụng sẽ hiển thị menu:

- **Tùy chọn 1**: Nhập tên nút giao (hỗ trợ tìm kiếm không phân biệt hoa thường)
- **Tùy chọn 2**: Xem danh sách tất cả nút giao và chọn bằng số
- **Tùy chọn 3**: Thoát

### 2. Hệ thống Cache và Offline

Ứng dụng hoạt động theo thứ tự ưu tiên:

1. **Database** (xanh lá): Kết nối trực tiếp với database và lấy cấu hình mới nhất
2. **Cache** (cam): Sử dụng cấu hình đã lưu trong file `traffic_config_cache.json`
3. **Minimal Fallback** (đỏ): Cấu hình tối thiểu với 2 pha cơ bản

### 3. Schedule và Pattern

Ứng dụng sẽ tự động:

- Tìm schedule đang active (`isActive = true`) cho nút giao đã chọn
- Xác định pattern phù hợp dựa trên:
  - **Chế độ "auto"**: Sử dụng `autoPatternId`
  - **Chế độ "schedule"**: Tìm time slot phù hợp với thời gian hiện tại
- Hỗ trợ cả định dạng cũ và mới của timing configuration
- Lưu cấu hình thành công vào cache để sử dụng offline

### 4. Mô phỏng

- Hiển thị đèn giao thông 4 hướng (Bắc, Nam, Đông, Tây)
- Số pha linh hoạt từ 1-4 tùy theo cấu hình
- Đếm ngược thời gian cho mỗi pha
- Cập nhật cấu hình định kỳ (mỗi nửa chu kỳ)
- Hiển thị thông tin nút giao, chu kỳ, và nguồn cấu hình

### 5. API Endpoint

Ứng dụng cung cấp REST API tại `http://localhost:8000`:

- `GET /traffic-light-state`: Lấy trạng thái hiện tại của đèn giao thông

## File Cache

### Vị trí và định dạng

File cache: `traffic_config_cache.json` trong thư mục ứng dụng

```json
{
  "junction_id": "uuid-of-junction",
  "junction_name": "Tên nút giao",
  "timestamp": "2023-12-07T10:30:00",
  "source": "database",
  "config": {
    "CYCLE_TIME": 60,
    "YELLOW_TIME": 3,
    "ALL_RED_TIME": 2,
    "PHASES": [...]
  }
}
```

### Quản lý Cache

- **Tự động tạo**: Khi kết nối database thành công
- **Tự động sử dụng**: Khi không kết nối được database
- **Tự động cập nhật**: Mỗi khi có cấu hình mới từ database
- **Kiểm tra tương thích**: Chỉ sử dụng cache của cùng junction

## Cấu Trúc Database

### Junction

- `junctionId`: ID nút giao
- `junctionName`: Tên nút giao
- `location`: Vị trí

### ScheduleConfig

- `scheduleId`: ID lịch trình
- `junctionId`: ID nút giao
- `mode`: "auto" hoặc "schedule"
- `autoPatternId`: ID pattern cho chế độ auto
- `daySchedules`: Lịch trình theo ngày (JSON)
- `isActive`: Trạng thái hoạt động

### TrafficPattern

Hỗ trợ hai định dạng timing configuration:

#### Định dạng mới (từ web interface):

```json
{
  "cycleDuration": 120,
  "yellowTime": 3,
  "allRedTime": 2,
  "phases": [
    {
      "phaseId": "phase1",
      "phaseName": "Pha Bắc-Nam",
      "startTime": 0,
      "duration": 30,
      "isActive": true,
      "lightStates": {
        "light-id-1": "green",
        "light-id-2": "red"
      }
    }
  ]
}
```

#### Định dạng cũ (simulator):

```json
{
  "cycleTime": 60,
  "yellowTime": 3,
  "allRedTime": 2,
  "phases": [
    {
      "startTime": 0,
      "direction": "Bắc",
      "greenTime": 25
    }
  ]
}
```

## Scripts Hỗ Trợ

### test_db_connection.py

Script kiểm tra kết nối database và hiển thị thông tin chi tiết:

- Danh sách tất cả nút giao
- Schedule configs với trạng thái active
- Traffic patterns với timing configuration chi tiết
- Traffic lights của mỗi junction
- Test mapping phases với directions

Sử dụng:

```bash
python test_db_connection.py
```

## Điều Khiển

- **ESC**: Thoát ứng dụng
- **Đóng cửa sổ**: Thoát ứng dụng

## Màu sắc Nguồn Cấu hình

- **🟢 Xanh lá**: Database (online, real-time)
- **🟠 Cam**: Cache (offline, đã lưu trước)
- **🔴 Đỏ**: Minimal fallback (offline, cấu hình tối thiểu)

## Troubleshooting

### Lỗi kết nối database

1. Kiểm tra file `.env` có tồn tại và đúng định dạng
2. Chạy `python test_db_connection.py` để kiểm tra
3. Ứng dụng sẽ tự động chuyển sang chế độ cache/offline

### Không tìm thấy nút giao

1. Chạy `python test_db_connection.py` để xem danh sách có sẵn
2. Thử sử dụng tùy chọn 2 (chọn từ danh sách)
3. Kiểm tra tên nút giao nhập vào có khớp với database

### Chế độ offline

- Ứng dụng vẫn hoạt động bình thường với cache
- Cache sẽ được cập nhật khi kết nối lại database
- Cấu hình minimal đảm bảo ứng dụng luôn chạy được

### File cache bị lỗi

- Xóa file `traffic_config_cache.json`
- Chạy lại ứng dụng với kết nối database
- Cache mới sẽ được tạo tự động

## Lưu Ý

- Ứng dụng ưu tiên kết nối database khi có thể
- Cache được cập nhật mỗi khi có cấu hình mới từ database
- Hỗ trợ hoạt động hoàn toàn offline với cache
- Tự động mapping phases từ định dạng mới sang định dạng cũ
- Hiển thị nguồn cấu hình để người dùng biết trạng thái hiện tại
- Hỗ trợ số pha linh hoạt thay vì cố định 4 pha
