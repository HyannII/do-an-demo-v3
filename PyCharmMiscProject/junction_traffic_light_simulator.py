import pygame
import sys
import psycopg2
from datetime import datetime
import json
import threading
from fastapi import FastAPI
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Khởi tạo Pygame
pygame.init()

# Cấu hình cửa sổ
WINDOW_WIDTH = 600
WINDOW_HEIGHT = 600
WINDOW = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
pygame.display.set_caption("Mô phỏng đèn giao thông 4 pha")

# Màu sắc
RED = (255, 0, 0)
YELLOW = (255, 255, 0)
GREEN = (0, 255, 0)
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)

# Màu mờ (khi không hoạt động)
DIM_RED = (150, 0, 0)
DIM_YELLOW = (150, 150, 0)
DIM_GREEN = (0, 150, 0)

# Biến toàn cục để lưu cấu hình
CYCLE_TIME = 0
YELLOW_TIME = 0
ALL_RED_TIME = 0
PHASES = []
JUNCTION_ID = ""
JUNCTION_NAME = ""
CONFIG_SOURCE = "unknown"  # Nguồn cấu hình hiện tại: database, cache, minimal_fallback

# File cache cho cấu hình
CACHE_FILE = "traffic_config_cache.json"

# Biến để lưu trạng thái đèn và thời gian đếm ngược
lights_state = {"Bắc": "red", "Nam": "red", "Đông": "red", "Tây": "red"}
countdowns = {"Bắc": None, "Nam": None, "Đông": None, "Tây": None}
current_time = 0
last_config_update = 0  # Biến để theo dõi thời điểm cập nhật cấu hình cuối cùng

# Biến để lưu trữ cấu hình mới từ worker thread
new_config = None
config_lock = threading.Lock()  # Lock để đồng bộ truy cập vào new_config

# Lock để đồng bộ truy cập vào trạng thái đèn và các biến toàn cục
state_lock = threading.Lock()

# Khởi tạo FastAPI
app = FastAPI()

# Thêm CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Origin của web app
    allow_credentials=True,
    allow_methods=["*"],  # Cho phép tất cả các phương thức (GET, POST, v.v.)
    allow_headers=["*"],  # Cho phép tất cả các header
)

# API endpoint để lấy trạng thái đèn
@app.get("/traffic-light-state")
async def get_traffic_light_state():
    with state_lock:
        return {
            "current_time": current_time,
            "lights_state": lights_state.copy(),
            "countdowns": countdowns.copy(),
            "junction_name": JUNCTION_NAME,
            "junction_id": JUNCTION_ID
        }

# Hàm lấy danh sách tất cả junction
def get_all_junctions():
    try:
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            raise ValueError("DATABASE_URL không được tìm thấy trong biến môi trường")

        conn = psycopg2.connect(
            database_url,
            sslmode="require"
        )
        cursor = conn.cursor()

        query = """
        SELECT "junctionId", "junctionName", "location"
        FROM "Junction"
        ORDER BY "junctionName"
        """
        cursor.execute(query)
        results = cursor.fetchall()

        cursor.close()
        conn.close()

        return [
            {
                "junctionId": result[0],
                "junctionName": result[1],
                "location": result[2]
            }
            for result in results
        ]
    except Exception as e:
        print(f"Lỗi khi lấy danh sách nút giao: {e}")
        return []

# Hàm tìm junction theo tên
def get_junction_by_name(junction_name):
    try:
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            raise ValueError("DATABASE_URL không được tìm thấy trong biến môi trường")

        conn = psycopg2.connect(
            database_url,
            sslmode="require"
        )
        cursor = conn.cursor()

        # Tìm junction theo tên (không phân biệt hoa thường)
        query = """
        SELECT "junctionId", "junctionName", "location"
        FROM "Junction"
        WHERE LOWER("junctionName") LIKE LOWER(%s)
        LIMIT 1
        """
        cursor.execute(query, (f"%{junction_name}%",))
        result = cursor.fetchone()

        cursor.close()
        conn.close()

        if result:
            return {
                "junctionId": result[0],
                "junctionName": result[1],
                "location": result[2]
            }
        return None
    except Exception as e:
        print(f"Lỗi khi tìm nút giao: {e}")
        return None

# Hàm lấy active schedule của junction
def get_active_schedule(junction_id):
    try:
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            raise ValueError("DATABASE_URL không được tìm thấy trong biến môi trường")

        conn = psycopg2.connect(
            database_url,
            sslmode="require"
        )
        cursor = conn.cursor()

        # Lấy schedule đang active
        query = """
        SELECT "scheduleId", "scheduleName", "mode", "autoPatternId", "daySchedules"
        FROM "ScheduleConfig"
        WHERE "junctionId" = %s AND "isActive" = true
        LIMIT 1
        """
        cursor.execute(query, (junction_id,))
        result = cursor.fetchone()

        cursor.close()
        conn.close()

        if result:
            return {
                "scheduleId": result[0],
                "scheduleName": result[1],
                "mode": result[2],
                "autoPatternId": result[3],
                "daySchedules": result[4]
            }
        return None
    except Exception as e:
        print(f"Lỗi khi lấy active schedule: {e}")
        return None

# Hàm lấy pattern theo thời gian hiện tại từ schedule
def get_current_pattern_from_schedule(schedule, junction_id):
    try:
        if schedule["mode"] == "auto":
            # Nếu là chế độ auto, dùng autoPattern
            return get_traffic_pattern_by_id(schedule["autoPatternId"])
        
        elif schedule["mode"] == "schedule":
            # Nếu là chế độ schedule, tìm pattern theo thời gian hiện tại
            now = datetime.now()
            current_day = now.weekday() + 1  # Python: 0=Monday, Database: 1=Monday
            if current_day == 7:  # Sunday
                current_day = 0
            current_time_str = now.strftime("%H:%M")
            
            day_schedules = schedule["daySchedules"]
            
            # Tìm lịch cho ngày hiện tại
            for day_schedule in day_schedules:
                if day_schedule["dayOfWeek"] == current_day and day_schedule["isActive"]:
                    # Tìm time slot phù hợp
                    for time_slot in day_schedule["timeSlots"]:
                        if time_slot["isActive"]:
                            start_time = time_slot["startTime"]
                            end_time = time_slot["endTime"]
                            
                            if start_time <= current_time_str < end_time:
                                return get_traffic_pattern_by_id(time_slot["patternId"])
            
            # Nếu không tìm thấy, trả về None
            return None
        
        return None
    except Exception as e:
        print(f"Lỗi khi lấy pattern từ schedule: {e}")
        return None

# Hàm lấy traffic pattern theo ID
def get_traffic_pattern_by_id(pattern_id):
    try:
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            raise ValueError("DATABASE_URL không được tìm thấy trong biến môi trường")

        conn = psycopg2.connect(
            database_url,
            sslmode="require"
        )
        cursor = conn.cursor()

        query = """
        SELECT "timingConfiguration"
        FROM "TrafficPattern"
        WHERE "patternId" = %s
        LIMIT 1
        """
        cursor.execute(query, (pattern_id,))
        result = cursor.fetchone()

        cursor.close()
        conn.close()

        if result:
            return result[0]
        return None
    except Exception as e:
        print(f"Lỗi khi lấy traffic pattern: {e}")
        return None

# Hàm lấy traffic lights của junction
def get_junction_traffic_lights(junction_id):
    try:
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            raise ValueError("DATABASE_URL không được tìm thấy trong biến môi trường")

        conn = psycopg2.connect(
            database_url,
            sslmode="require"
        )
        cursor = conn.cursor()

        query = """
        SELECT "trafficLightId", "location"
        FROM "TrafficLight"
        WHERE "junctionId" = %s
        ORDER BY "location"
        """
        cursor.execute(query, (junction_id,))
        results = cursor.fetchall()

        cursor.close()
        conn.close()

        # Trích xuất hướng từ location field
        traffic_lights = []
        for result in results:
            traffic_light_id = result[0]
            location = result[1]
            
            # Trích xuất hướng từ location string
            direction = None
            if "hướng Bắc" in location or "Hướng Bắc" in location:
                direction = "Bắc"
            elif "hướng Nam" in location or "Hướng Nam" in location:
                direction = "Nam"
            elif "hướng Đông" in location or "Hướng Đông" in location:
                direction = "Đông"
            elif "hướng Tây" in location or "Hướng Tây" in location:
                direction = "Tây"
            else:
                # Fallback: tìm các từ khóa khác
                location_lower = location.lower()
                if "bắc" in location_lower:
                    direction = "Bắc"
                elif "nam" in location_lower:
                    direction = "Nam"
                elif "đông" in location_lower:
                    direction = "Đông"
                elif "tây" in location_lower:
                    direction = "Tây"
            
            traffic_lights.append({
                "trafficLightId": traffic_light_id,
                "location": location,
                "direction": direction
            })
            
        return traffic_lights
    except Exception as e:
        print(f"Lỗi khi lấy traffic lights: {e}")
        return []

# Hàm lưu cấu hình vào cache file
def save_config_to_cache(config_data, source="database"):
    try:
        cache_data = {
            "junction_id": JUNCTION_ID,
            "junction_name": JUNCTION_NAME,
            "timestamp": datetime.now().isoformat(),
            "source": source,
            "config": config_data
        }
        
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, ensure_ascii=False, indent=2)
        
        print(f"✅ Đã lưu cấu hình vào cache: {CACHE_FILE}")
    except Exception as e:
        print(f"❌ Lỗi khi lưu cache: {e}")

# Hàm đọc cấu hình từ cache file
def load_config_from_cache():
    try:
        if not os.path.exists(CACHE_FILE):
            print(f"📁 File cache không tồn tại: {CACHE_FILE}")
            return None
        
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            cache_data = json.load(f)
        
        # Kiểm tra xem cache có phù hợp với junction hiện tại không
        if cache_data.get("junction_id") != JUNCTION_ID:
            print(f"⚠️  Cache không phù hợp với junction hiện tại ({JUNCTION_ID})")
            return None
        
        config = cache_data.get("config")
        if config:
            cache_time = cache_data.get("timestamp", "Unknown")
            source = cache_data.get("source", "unknown")
            print(f"📂 Đã đọc cấu hình từ cache (nguồn: {source}, thời gian: {cache_time})")
            return config
        
        return None
    except Exception as e:
        print(f"❌ Lỗi khi đọc cache: {e}")
        return None

# Hàm kết nối và đọc dữ liệu từ PostgreSQL (có thể chạy đồng bộ hoặc bất đồng bộ)
def load_config_from_db(sync=True):
    global new_config, CYCLE_TIME, YELLOW_TIME, ALL_RED_TIME, PHASES, CONFIG_SOURCE
    try:
        # Lấy active schedule
        schedule = get_active_schedule(JUNCTION_ID)
        if not schedule:
            print(f"{'Main thread' if sync else 'Worker thread'} - Không tìm thấy schedule active cho junction {JUNCTION_NAME}")
            # Thử đọc từ cache trước
            cached_config = load_config_from_cache()
            if cached_config:
                print(f"{'Main thread' if sync else 'Worker thread'} - Sử dụng cấu hình từ cache")
                if sync:
                    with state_lock:
                        CYCLE_TIME = cached_config["CYCLE_TIME"]
                        YELLOW_TIME = cached_config["YELLOW_TIME"]
                        ALL_RED_TIME = cached_config["ALL_RED_TIME"]
                        PHASES = cached_config["PHASES"]
                        CONFIG_SOURCE = "cache"
                    print(f"Main thread - Đã áp dụng cấu hình từ cache. CYCLE_TIME: {CYCLE_TIME}s")
                else:
                    with config_lock:
                        new_config = cached_config.copy()
                        new_config["CONFIG_SOURCE"] = "cache"
                    print(f"Worker thread - Đã áp dụng cấu hình từ cache. CYCLE_TIME: {cached_config['CYCLE_TIME']}s")
                return
            else:
                return load_minimal_config(sync)

        # Lấy pattern từ schedule
        timing_config = get_current_pattern_from_schedule(schedule, JUNCTION_ID)
        if not timing_config:
            print(f"{'Main thread' if sync else 'Worker thread'} - Không tìm thấy pattern phù hợp cho thời gian hiện tại")
            # Thử đọc từ cache trước
            cached_config = load_config_from_cache()
            if cached_config:
                print(f"{'Main thread' if sync else 'Worker thread'} - Sử dụng cấu hình từ cache")
                if sync:
                    with state_lock:
                        CYCLE_TIME = cached_config["CYCLE_TIME"]
                        YELLOW_TIME = cached_config["YELLOW_TIME"]
                        ALL_RED_TIME = cached_config["ALL_RED_TIME"]
                        PHASES = cached_config["PHASES"]
                        CONFIG_SOURCE = "cache"
                    print(f"Main thread - Đã áp dụng cấu hình từ cache. CYCLE_TIME: {CYCLE_TIME}s")
                else:
                    with config_lock:
                        new_config = cached_config.copy()
                        new_config["CONFIG_SOURCE"] = "cache"
                    print(f"Worker thread - Đã áp dụng cấu hình từ cache. CYCLE_TIME: {cached_config['CYCLE_TIME']}s")
                return
            else:
                return load_minimal_config(sync)

        # Xử lý hai định dạng timing configuration
        if "cycleDuration" in timing_config:
            # Định dạng mới (từ web interface)
            cycle_time = timing_config.get("cycleDuration", 60)
            yellow_time = timing_config.get("yellowTime", 3)
            all_red_time = timing_config.get("allRedTime", 2)
            
            # Lấy thông tin traffic lights của junction
            traffic_lights = get_junction_traffic_lights(JUNCTION_ID)
            light_direction_map = {}
            for light in traffic_lights:
                light_direction_map[light["trafficLightId"]] = light["direction"]
            
            # Giữ nguyên định dạng mới với lightStates
            phases = []
            raw_phases = timing_config.get("phases", [])
            
            # Xử lý phases với lightStates
            for phase in raw_phases:
                if not phase.get("isActive", True):
                    continue
                    
                start_time = phase.get("startTime", 0)
                duration = phase.get("duration", 0)
                light_states = phase.get("lightStates", {})
                phase_name = phase.get("phaseName", "")
                
                # Xác định hướng từ phaseName (đáng tin cậy hơn)
                direction = None
                if "Bắc" in phase_name:
                    direction = "Bắc"
                elif "Nam" in phase_name:
                    direction = "Nam"
                elif "Đông" in phase_name:
                    direction = "Đông"
                elif "Tây" in phase_name:
                    direction = "Tây"
                
                # Xác định màu đèn từ lightStates
                direction_color = "red"  # mặc định
                if direction and direction in light_direction_map.values():
                    # Tìm traffic light ID tương ứng với direction
                    for light_id, light_direction in light_direction_map.items():
                        if light_direction == direction and light_id in light_states:
                            direction_color = light_states[light_id]
                            break
                
                # Nếu không tìm thấy từ light mapping, dùng pattern từ phase name
                if direction_color == "red" and direction:
                    if "Xanh" in phase_name:
                        direction_color = "green" 
                    elif "Vàng" in phase_name:
                        direction_color = "yellow"
                    elif "Đỏ" in phase_name:
                        direction_color = "red"
                
                if direction:  # Chỉ thêm phase nếu xác định được direction
                    phases.append({
                        "startTime": start_time,
                        "duration": duration,
                        "direction": direction,
                        "color": direction_color,
                        "lightStates": light_states,
                        "phaseName": phase_name
                    })
        else:
            # Định dạng cũ (simulator format)
            cycle_time = timing_config.get("cycleTime", 60)
            yellow_time = timing_config.get("yellowTime", 3)
            all_red_time = timing_config.get("allRedTime", 2)
            phases = timing_config.get("phases", [])

        config_data = {
            "CYCLE_TIME": cycle_time,
            "YELLOW_TIME": yellow_time,
            "ALL_RED_TIME": all_red_time,
            "PHASES": phases
        }

        if sync:
            # Cập nhật trực tiếp nếu chạy đồng bộ
            with state_lock:
                CYCLE_TIME = config_data["CYCLE_TIME"]
                YELLOW_TIME = config_data["YELLOW_TIME"]
                ALL_RED_TIME = config_data["ALL_RED_TIME"]
                PHASES = config_data["PHASES"]
                CONFIG_SOURCE = "database"
            print(f"Main thread - Đã đọc cấu hình từ schedule active. CYCLE_TIME: {CYCLE_TIME}s, Phases: {len(PHASES)}")
            # In thông tin chi tiết về phases
            for i, phase in enumerate(PHASES):
                color = phase.get('color', 'unknown')
                print(f"  Phase {i+1}: {phase['direction']} - Start: {phase['startTime']}s, Duration: {phase['duration']}s, Color: {color}")
        else:
            # Lưu vào new_config nếu chạy bất đồng bộ
            with config_lock:
                new_config = config_data.copy()
                new_config["CONFIG_SOURCE"] = "database"
            print(f"Worker thread - Đã đọc cấu hình từ schedule active. CYCLE_TIME: {new_config['CYCLE_TIME']}s, Phases: {len(new_config['PHASES'])}")
            # In thông tin chi tiết về phases
            for i, phase in enumerate(new_config['PHASES']):
                color = phase.get('color', 'unknown')
                print(f"  Phase {i+1}: {phase['direction']} - Start: {phase['startTime']}s, Duration: {phase['duration']}s, Color: {color}")

        # Lưu cấu hình thành công vào cache
        save_config_to_cache(config_data, "database")

    except Exception as e:
        print(f"{'Main thread' if sync else 'Worker thread'} - Lỗi khi đọc từ cơ sở dữ liệu: {e}")
        # Thử đọc từ cache trước khi dùng cấu hình mặc định
        cached_config = load_config_from_cache()
        if cached_config:
            print(f"{'Main thread' if sync else 'Worker thread'} - Sử dụng cấu hình từ cache")
            if sync:
                with state_lock:
                    CYCLE_TIME = cached_config["CYCLE_TIME"]
                    YELLOW_TIME = cached_config["YELLOW_TIME"]
                    ALL_RED_TIME = cached_config["ALL_RED_TIME"]
                    PHASES = cached_config["PHASES"]
                    CONFIG_SOURCE = "cache"
                print(f"Main thread - Đã áp dụng cấu hình từ cache. CYCLE_TIME: {CYCLE_TIME}s, Phases: {len(PHASES)}")
            else:
                with config_lock:
                    new_config = cached_config.copy()
                    new_config["CONFIG_SOURCE"] = "cache"
                print(f"Worker thread - Đã áp dụng cấu hình từ cache. CYCLE_TIME: {cached_config['CYCLE_TIME']}s, Phases: {len(cached_config['PHASES'])}")
        else:
            # Không có cache, dùng cấu hình minimal
            load_minimal_config(sync)

# Hàm load cấu hình minimal (khi không có cache và không kết nối được database)
def load_minimal_config(sync=True):
    global new_config, CYCLE_TIME, YELLOW_TIME, ALL_RED_TIME, PHASES, CONFIG_SOURCE
    
    # Cấu hình minimal với 4 pha đơn giản: Bắc xanh, Bắc vàng, Đông xanh, Đông vàng
    config_data = {
        "CYCLE_TIME": 60,
        "YELLOW_TIME": 3,
        "ALL_RED_TIME": 2,
        "PHASES": [
            {"startTime": 0, "duration": 25, "direction": "Bắc", "color": "green"},
            {"startTime": 25, "duration": 3, "direction": "Bắc", "color": "yellow"},
            {"startTime": 30, "duration": 25, "direction": "Đông", "color": "green"},
            {"startTime": 55, "duration": 3, "direction": "Đông", "color": "yellow"}
        ]
    }
    
    if sync:
        with state_lock:
            CYCLE_TIME = config_data["CYCLE_TIME"]
            YELLOW_TIME = config_data["YELLOW_TIME"]
            ALL_RED_TIME = config_data["ALL_RED_TIME"]
            PHASES = config_data["PHASES"]
            CONFIG_SOURCE = "minimal_fallback"
        print(f"Main thread - Sử dụng cấu hình minimal (offline). CYCLE_TIME: {CYCLE_TIME}s, Phases: {len(PHASES)}")
        # Lưu cấu hình minimal vào cache cho lần sau
        save_config_to_cache(config_data, "minimal_fallback")
    else:
        with config_lock:
            new_config = config_data.copy()
            new_config["CONFIG_SOURCE"] = "minimal_fallback"
        print(f"Worker thread - Sử dụng cấu hình minimal (offline). CYCLE_TIME: {new_config['CYCLE_TIME']}s, Phases: {len(new_config['PHASES'])}")

# Hàm cập nhật cấu hình từ new_config
def update_config():
    global new_config, CYCLE_TIME, YELLOW_TIME, ALL_RED_TIME, PHASES, CONFIG_SOURCE
    with config_lock:
        if new_config is not None:
            with state_lock:
                CYCLE_TIME = new_config["CYCLE_TIME"]
                YELLOW_TIME = new_config["YELLOW_TIME"]
                ALL_RED_TIME = new_config["ALL_RED_TIME"]
                PHASES = new_config["PHASES"]
                CONFIG_SOURCE = new_config.get("CONFIG_SOURCE", "unknown")
            print(f"Main thread - Cập nhật cấu hình mới từ {CONFIG_SOURCE}. CYCLE_TIME: {CYCLE_TIME}s")
            # Reset new_config để tránh cập nhật lại
            new_config = None

# Hàm khởi tạo junction
def initialize_junction():
    global JUNCTION_ID, JUNCTION_NAME
    
    print("=== MÔ PHỎNG ĐÈN GIAO THÔNG 4 PHA ===")
    print("Vui lòng nhập tên nút giao để bắt đầu mô phỏng.")
    
    while True:
        print("\nLựa chọn:")
        print("1. Nhập tên nút giao")
        print("2. Xem danh sách tất cả nút giao")
        print("3. Thoát")
        
        choice = input("Chọn (1/2/3): ").strip()
        
        if choice == "1":
            junction_name = input("Nhập tên nút giao: ").strip()
            if not junction_name:
                print("Tên nút giao không được để trống. Vui lòng thử lại.")
                continue
                
            print(f"Đang tìm kiếm nút giao '{junction_name}'...")
            junction = get_junction_by_name(junction_name)
            
            if junction:
                JUNCTION_ID = junction["junctionId"]
                JUNCTION_NAME = junction["junctionName"]
                print(f"Đã tìm thấy nút giao: {JUNCTION_NAME}")
                print(f"Vị trí: {junction['location']}")
                print(f"ID: {JUNCTION_ID}")
                break
            else:
                print(f"Không tìm thấy nút giao với tên '{junction_name}'.")
                
        elif choice == "2":
            print("\nDanh sách tất cả nút giao:")
            junctions = get_all_junctions()
            if junctions:
                for i, junction in enumerate(junctions, 1):
                    print(f"{i}. {junction['junctionName']} - {junction['location']}")
                
                try:
                    selection = int(input(f"\nChọn nút giao (1-{len(junctions)}): "))
                    if 1 <= selection <= len(junctions):
                        selected_junction = junctions[selection - 1]
                        JUNCTION_ID = selected_junction["junctionId"]
                        JUNCTION_NAME = selected_junction["junctionName"]
                        print(f"Đã chọn nút giao: {JUNCTION_NAME}")
                        print(f"Vị trí: {selected_junction['location']}")
                        break
                    else:
                        print("Lựa chọn không hợp lệ.")
                except ValueError:
                    print("Vui lòng nhập số.")
            else:
                print("Không có nút giao nào trong hệ thống.")
                
        elif choice == "3":
            print("Thoát chương trình.")
            sys.exit()
            
        else:
            print("Lựa chọn không hợp lệ. Vui lòng chọn 1, 2 hoặc 3.")

# Khởi tạo junction trước khi đọc cấu hình
initialize_junction()

# Cập nhật tiêu đề cửa sổ với tên junction
pygame.display.set_caption(f"Mô phỏng đèn giao thông - {JUNCTION_NAME}")

# Đọc cấu hình lần đầu tiên (đồng bộ)
print("Đang khởi tạo cấu hình đèn giao thông...")
load_config_from_db(sync=True)

# Vị trí và kích thước đèn
LIGHT_RADIUS = 20
LIGHT_POSITIONS = {
    "Bắc": {
        "red": (WINDOW_WIDTH // 2, 100),
        "yellow": (WINDOW_WIDTH // 2, 140),
        "green": (WINDOW_WIDTH // 2, 180)
    },
    "Nam": {
        "red": (WINDOW_WIDTH // 2, WINDOW_HEIGHT - 180),
        "yellow": (WINDOW_WIDTH // 2, WINDOW_HEIGHT - 140),
        "green": (WINDOW_WIDTH // 2, WINDOW_HEIGHT - 100)
    },
    "Đông": {
        "red": (WINDOW_WIDTH - 100, WINDOW_HEIGHT // 2 - 40),
        "yellow": (WINDOW_WIDTH - 100, WINDOW_HEIGHT // 2),
        "green": (WINDOW_WIDTH - 100, WINDOW_HEIGHT // 2 + 40)
    },
    "Tây": {
        "red": (100, WINDOW_HEIGHT // 2 - 40),
        "yellow": (100, WINDOW_HEIGHT // 2),
        "green": (100, WINDOW_HEIGHT // 2 + 40)
    }
}

# Vị trí thời gian đếm ngược (bên cạnh đèn)
COUNTDOWN_POSITIONS = {
    "Bắc": (WINDOW_WIDTH // 2 + 60, 140),
    "Nam": (WINDOW_WIDTH // 2 + 60, WINDOW_HEIGHT - 140),
    "Đông": (WINDOW_WIDTH - 60, WINDOW_HEIGHT // 2),
    "Tây": (160, WINDOW_HEIGHT // 2)
}

# Font chữ cho thời gian và nhãn
FONT = pygame.font.SysFont("Cascadia Code", 30)

# Hàm vẽ đèn giao thông
def draw_traffic_light(positions, active_color):
    pygame.draw.circle(WINDOW, RED if active_color == "red" else DIM_RED, positions["red"], LIGHT_RADIUS)
    pygame.draw.circle(WINDOW, YELLOW if active_color == "yellow" else DIM_YELLOW, positions["yellow"], LIGHT_RADIUS)
    pygame.draw.circle(WINDOW, GREEN if active_color == "green" else DIM_GREEN, positions["green"], LIGHT_RADIUS)
    for pos in positions.values():
        pygame.draw.circle(WINDOW, BLACK, pos, LIGHT_RADIUS, 2)

# Hàm vẽ nhãn hướng
def draw_labels():
    labels = ["Bắc", "Nam", "Đông", "Tây"]
    positions = [
        (WINDOW_WIDTH // 2, 50),
        (WINDOW_WIDTH // 2, WINDOW_HEIGHT - 230),
        (WINDOW_WIDTH - 50, WINDOW_HEIGHT // 2 - 80),
        (50, WINDOW_HEIGHT // 2 - 80)
    ]
    for label, pos in zip(labels, positions):
        text = FONT.render(label, True, BLACK)
        text_rect = text.get_rect(center=pos)
        WINDOW.blit(text, text_rect)

# Hàm mô phỏng đèn giao thông
def traffic_light_simulation():
    global current_time, lights_state, countdowns, last_config_update
    clock = pygame.time.Clock()
    current_time = 0

    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    pygame.quit()
                    sys.exit()

        # Tăng thời gian hiện tại
        current_time = (current_time + 1) % CYCLE_TIME

        # Kiểm tra nếu đã qua nửa chu kỳ kể từ lần cập nhật cuối cùng
        with state_lock:
            half_cycle = CYCLE_TIME // 2
            time_since_last_update = (current_time - last_config_update) % CYCLE_TIME
            if time_since_last_update >= half_cycle:
                print(f"Đạt nửa chu kỳ ({half_cycle}s) tại current_time={current_time}. Đang đọc cấu hình mới...")
                # Chạy load_config_from_db trong một thread riêng (bất đồng bộ)
                threading.Thread(target=lambda: load_config_from_db(sync=False), daemon=True).start()
                last_config_update = current_time

        # Kiểm tra và cập nhật cấu hình mới nếu có
        update_config()

        # Cập nhật trạng thái đèn và đếm ngược trong một khối khóa
        with state_lock:
            # Khởi tạo trạng thái cho tất cả hướng có thể
            all_directions = ["Bắc", "Nam", "Đông", "Tây"]
            lights_state = {direction: "red" for direction in all_directions}
            countdowns = {direction: None for direction in all_directions}

            # Tìm phase đang active cho mỗi hướng
            for phase in PHASES:
                direction = phase["direction"]
                start_time = phase["startTime"]
                duration = phase["duration"]
                phase_end = start_time + duration
                color = phase.get("color", "red")
                
                # Kiểm tra nếu current_time nằm trong phase này
                if start_time <= current_time < phase_end:
                    # Phase này đang active
                    lights_state[direction] = color
                    countdowns[direction] = phase_end - current_time
            
            # Tính countdown cho các hướng đang đỏ (tìm phase tiếp theo)
            for direction in all_directions:
                if lights_state[direction] == "red":
                    # Tìm phase tiếp theo gần nhất cho direction này
                    next_phase_start = None
                    
                    # Tìm trong các phase sau current_time
                    for phase in PHASES:
                        if phase["direction"] == direction and phase["startTime"] > current_time:
                            if next_phase_start is None or phase["startTime"] < next_phase_start:
                                next_phase_start = phase["startTime"]
                    
                    if next_phase_start is not None:
                        # Có phase trong chu kỳ hiện tại
                        countdowns[direction] = next_phase_start - current_time
                    else:
                        # Không có phase nào sau current_time, tìm phase đầu tiên của chu kỳ tiếp theo
                        earliest_phase_start = None
                        for phase in PHASES:
                            if phase["direction"] == direction:
                                if earliest_phase_start is None or phase["startTime"] < earliest_phase_start:
                                    earliest_phase_start = phase["startTime"]
                        
                        if earliest_phase_start is not None:
                            countdowns[direction] = CYCLE_TIME - current_time + earliest_phase_start
                        else:
                            countdowns[direction] = CYCLE_TIME  # Fallback

        # Vẽ giao diện
        WINDOW.fill(WHITE)
        draw_labels()

        for direction in LIGHT_POSITIONS:
            with state_lock:
                state = lights_state[direction]
                countdown = countdowns[direction]
            draw_traffic_light(LIGHT_POSITIONS[direction], state)
            if countdown is not None:
                countdown_text = FONT.render(str(countdown), True, BLACK)
                countdown_rect = countdown_text.get_rect(center=COUNTDOWN_POSITIONS[direction])
                WINDOW.blit(countdown_text, countdown_rect)
        
        time_text = FONT.render(f"Thời gian: {current_time}s", True, BLACK)
        time_rect = time_text.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2 + 15))
        WINDOW.blit(time_text, time_rect)
        
        cycle_text = FONT.render(f"Chu kỳ: {CYCLE_TIME}s", True, BLACK)
        cycle_rect = cycle_text.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2 - 15))
        WINDOW.blit(cycle_text, cycle_rect)

        pygame.display.flip()
        clock.tick(1)



if __name__ == "__main__":
    print(f"\nBắt đầu mô phỏng đèn giao thông cho nút giao: {JUNCTION_NAME}")
    
    # Hiển thị thông tin cấu hình hiện tại
    with state_lock:
        print(f"✅ Cấu hình đã tải:")
        print(f"   Nguồn: {CONFIG_SOURCE}")
        print(f"   Chu kỳ: {CYCLE_TIME}s")
        print(f"   Đèn vàng: {YELLOW_TIME}s")
        print(f"   Đèn đỏ chung: {ALL_RED_TIME}s")
        print(f"   Số pha: {len(PHASES)}")
        for i, phase in enumerate(PHASES):
            color = phase.get('color', 'unknown')
            print(f"     Pha {i+1}: {phase['direction']} - Start: {phase['startTime']}s, Duration: {phase['duration']}s, Color: {color}")
    
    # Hiển thị thông tin file cache
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
            cache_time = cache_data.get("timestamp", "Unknown")
            cache_source = cache_data.get("source", "unknown")
            print(f"📁 Cache file: {CACHE_FILE}")
            print(f"   Thời gian: {cache_time}")
            print(f"   Nguồn: {cache_source}")
        except:
            print(f"📁 Cache file: {CACHE_FILE} (lỗi đọc)")
    else:
        print(f"📁 Cache file: {CACHE_FILE} (chưa tồn tại)")
    
    print("\n🎮 Điều khiển:")
    print("   ESC: Thoát mô phỏng")
    print("   Đóng cửa sổ: Thoát mô phỏng")
    print(f"\n🌐 API server: http://localhost:8000")
    print("   Endpoint: /traffic-light-state")
    
    # Chạy FastAPI server trong một thread riêng
    config = uvicorn.Config(app, host="0.0.0.0", port=8000, log_level="warning")
    server = uvicorn.Server(config)
    threading.Thread(target=server.run, daemon=True).start()
    
    # Chạy mô phỏng trong main thread
    traffic_light_simulation()