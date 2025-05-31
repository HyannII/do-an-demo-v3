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
WINDOW_WIDTH = 1200
WINDOW_HEIGHT = 700
WINDOW = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
pygame.display.set_caption("Mô phỏng đèn giao thông 4 pha")

# Cấu hình layout
MENU_WIDTH = 350
SIMULATION_WIDTH = WINDOW_WIDTH - MENU_WIDTH
SIMULATION_HEIGHT = WINDOW_HEIGHT

# Layout chia đôi theo tỉ lệ 65:35
LEFT_TOP_HEIGHT = int(WINDOW_HEIGHT * 0.65)  # Nửa trên bên trái: danh sách nút giao (65%)
LEFT_BOTTOM_HEIGHT = int(WINDOW_HEIGHT * 0.35)  # Nửa dưới bên trái: thông tin chi tiết (35%)
RIGHT_TOP_HEIGHT = int(WINDOW_HEIGHT * 0.65)  # Nửa trên bên phải: giả lập đèn (65%)
RIGHT_BOTTOM_HEIGHT = int(WINDOW_HEIGHT * 0.35)  # Nửa dưới bên phải: biểu đồ (35%)

# Màu sắc
RED = (255, 0, 0)
YELLOW = (255, 255, 0)
GREEN = (0, 255, 0)
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
GRAY = (128, 128, 128)
LIGHT_GRAY = (220, 220, 220)
BLUE = (0, 100, 200)
LIGHT_BLUE = (173, 216, 230)

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

# GUI state variables
junctions_list = []
filtered_junctions = []  # For search results
selected_junction_index = -1
simulation_running = False
scroll_offset = 0
loading_junctions = True
search_text = ""
search_active = False
show_info_panel = False  # Show detailed info panel

# Search input box (positioned in top half)
search_box = pygame.Rect(10, 50, MENU_WIDTH - 20, 25)
stop_button = pygame.Rect(10, 80, 80, 25)

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

# Khởi tạo junction trước khi đọc cấu hình (Commented out for GUI version)
# initialize_junction()

# Cập nhật tiêu đề cửa sổ với tên junction (will be updated dynamically in GUI)
# pygame.display.set_caption(f"Mô phỏng đèn giao thông - {JUNCTION_NAME}")

# Đọc cấu hình lần đầu tiên (đồng bộ) (Commented out for GUI version - loaded when junction is selected)
# print("Đang khởi tạo cấu hình đèn giao thông...")
# load_config_from_db(sync=True)

# Vị trí và kích thước đèn (điều chỉnh cho nửa trên bên phải)
LIGHT_RADIUS = 20
SIM_OFFSET_X = MENU_WIDTH  # Bắt đầu từ sau menu
SIM_CENTER_X = SIM_OFFSET_X + SIMULATION_WIDTH // 2
SIM_CENTER_Y = RIGHT_TOP_HEIGHT // 2  # Center of top right area

LIGHT_POSITIONS = {
    "Bắc": {
        "red": (SIM_CENTER_X - 45, 120),
        "yellow": (SIM_CENTER_X, 120),
        "green": (SIM_CENTER_X + 45, 120)
    },
    "Nam": {
        "red": (SIM_CENTER_X - 45, RIGHT_TOP_HEIGHT - 40),
        "yellow": (SIM_CENTER_X, RIGHT_TOP_HEIGHT - 40),
        "green": (SIM_CENTER_X + 45, RIGHT_TOP_HEIGHT - 40)
    },
    "Đông": {
        "red": (SIM_OFFSET_X + SIMULATION_WIDTH - 155, SIM_CENTER_Y + 30),
        "yellow": (SIM_OFFSET_X + SIMULATION_WIDTH - 110, SIM_CENTER_Y + 30),
        "green": (SIM_OFFSET_X + SIMULATION_WIDTH - 65, SIM_CENTER_Y + 30)
    },
    "Tây": {
        "red": (SIM_OFFSET_X + 65, SIM_CENTER_Y + 30),
        "yellow": (SIM_OFFSET_X + 110, SIM_CENTER_Y + 30),
        "green": (SIM_OFFSET_X + 155, SIM_CENTER_Y + 30)
    }
}

# Vị trí thời gian đếm ngược (phía bên phải mỗi cụm đèn)
COUNTDOWN_POSITIONS = {
    "Bắc": (SIM_CENTER_X + 85, 120),  # Right of horizontal lights
    "Nam": (SIM_CENTER_X + 85, RIGHT_TOP_HEIGHT - 40),  # Right of horizontal lights
    "Đông": (SIM_OFFSET_X + SIMULATION_WIDTH - 20, SIM_CENTER_Y + 30),  # Right of horizontal lights
    "Tây": (SIM_OFFSET_X + 200, SIM_CENTER_Y + 30)  # Right of horizontal lights
}

# Font chữ cho thời gian và nhãn (regular, không italic)
FONT_LARGE = pygame.font.SysFont("Verdana", 24)  # Regular font
FONT_MEDIUM = pygame.font.SysFont("Verdana", 18)  # Regular font
FONT_SMALL = pygame.font.SysFont("Verdana", 14)  # Regular font

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
        (SIM_CENTER_X, 150),
        (SIM_CENTER_X, SIMULATION_HEIGHT - 110),
        (SIM_OFFSET_X + SIMULATION_WIDTH - 50, SIM_CENTER_Y - 40),
        (SIM_OFFSET_X + 50, SIM_CENTER_Y - 40)
    ]
    for label, pos in zip(labels, positions):
        text = FONT_LARGE.render(label, True, BLACK)
        text_rect = text.get_rect(center=pos)
        WINDOW.blit(text, text_rect)

# Hàm mô phỏng đèn giao thông với GUI
def main_gui():
    global current_time, lights_state, countdowns, last_config_update, search_text, search_active
    clock = pygame.time.Clock()
    current_time = 0
    
    # Load junctions list in background
    threading.Thread(target=load_junctions_async, daemon=True).start()

    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    pygame.quit()
                    sys.exit()
                elif search_active:
                    # Handle search input
                    if event.key == pygame.K_BACKSPACE:
                        search_text = search_text[:-1]
                        filter_junctions()
                    elif event.key == pygame.K_RETURN:
                        search_active = False
                    elif event.unicode.isprintable():
                        search_text += event.unicode
                        filter_junctions()
            if event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1:  # Left click
                    mouse_pos = pygame.mouse.get_pos()
                    if mouse_pos[0] < MENU_WIDTH:  # Click in menu area
                        handle_menu_click(mouse_pos)
                elif event.button in [4, 5]:  # Mouse wheel
                    mouse_pos = pygame.mouse.get_pos()
                    if mouse_pos[0] < MENU_WIDTH and mouse_pos[1] < LEFT_TOP_HEIGHT:  # Scroll in top left area only
                        handle_scroll(event)

        # Update simulation time only if simulation is running
        if simulation_running and CYCLE_TIME > 0:
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
        draw_menu()  # Top left: Junction list
        draw_info_detail()  # Bottom left: Junction details
        draw_simulation()  # Top right: Traffic light simulation
        draw_phase_chart()  # Bottom right: Phase timing chart

        pygame.display.flip()
        clock.tick(1)

# GUI Functions
def load_junctions_async():
    """Load junctions list in background thread"""
    global junctions_list, filtered_junctions, loading_junctions
    try:
        junctions = get_all_junctions()
        junctions_list = junctions
        filtered_junctions = junctions.copy()  # Initially show all junctions
        loading_junctions = False
        print(f"Đã tải {len(junctions)} nút giao")
    except Exception as e:
        print(f"Lỗi khi tải danh sách nút giao: {e}")
        loading_junctions = False

def filter_junctions():
    """Filter junctions based on search text"""
    global filtered_junctions, scroll_offset
    if not search_text:
        filtered_junctions = junctions_list.copy()
    else:
        search_lower = search_text.lower()
        filtered_junctions = [
            junction for junction in junctions_list
            if search_lower in junction["junctionName"].lower() or 
               search_lower in junction["location"].lower()
        ]
    scroll_offset = 0  # Reset scroll when filtering

def draw_search_box():
    """Draw the search input box"""
    # Search box background
    pygame.draw.rect(WINDOW, WHITE, search_box)
    pygame.draw.rect(WINDOW, GRAY if not search_active else BLUE, search_box, 2)
    
    # Search text
    search_display = search_text if search_text else "Tìm kiếm..."
    text_color = BLACK if search_text else GRAY
    search_text_surface = FONT_SMALL.render(search_display, True, text_color)
    text_rect = search_text_surface.get_rect(left=search_box.left + 5, centery=search_box.centery)
    WINDOW.blit(search_text_surface, text_rect)

def draw_stop_button():
    """Draw the stop/reset button"""
    button_color = LIGHT_BLUE if simulation_running else LIGHT_GRAY
    text_color = BLACK if simulation_running else GRAY
    
    pygame.draw.rect(WINDOW, button_color, stop_button)
    pygame.draw.rect(WINDOW, GRAY, stop_button, 2)
    
    button_text = "Dừng" if simulation_running else "Reset"
    text_surface = FONT_SMALL.render(button_text, True, text_color)
    text_rect = text_surface.get_rect(center=stop_button.center)
    WINDOW.blit(text_surface, text_rect)

def draw_menu():
    """Draw the top half of left menu panel - junction list"""
    global scroll_offset
    
    # Draw top menu background
    menu_rect = pygame.Rect(0, 0, MENU_WIDTH, LEFT_TOP_HEIGHT)
    pygame.draw.rect(WINDOW, LIGHT_GRAY, menu_rect)
    pygame.draw.line(WINDOW, GRAY, (MENU_WIDTH, 0), (MENU_WIDTH, LEFT_TOP_HEIGHT), 2)
    pygame.draw.line(WINDOW, GRAY, (0, LEFT_TOP_HEIGHT), (MENU_WIDTH, LEFT_TOP_HEIGHT), 2)
    
    # Draw title
    title_text = FONT_MEDIUM.render("Danh sách nút giao", True, BLACK)
    title_rect = title_text.get_rect(center=(MENU_WIDTH // 2, 25))
    WINDOW.blit(title_text, title_rect)
    
    # Draw search box
    draw_search_box()
    
    # Draw stop button
    draw_stop_button()
    
    # Draw loading or junction list
    if loading_junctions:
        loading_text = FONT_SMALL.render("Đang tải...", True, GRAY)
        loading_rect = loading_text.get_rect(center=(MENU_WIDTH // 2, LEFT_TOP_HEIGHT // 2))
        WINDOW.blit(loading_text, loading_rect)
    else:
        # Draw junction list (more space available with 65% height)
        y_start = 110
        item_height = 50  # Updated to match draw_menu
        available_height = LEFT_TOP_HEIGHT - y_start - 10
        visible_items = available_height // item_height
        

        
        for i, junction in enumerate(filtered_junctions):
            if i < scroll_offset:
                continue
            if i >= scroll_offset + visible_items:
                break
                
            y_pos = y_start + (i - scroll_offset) * item_height
            if y_pos + item_height > LEFT_TOP_HEIGHT:
                break
                
            # Draw junction item
            item_rect = pygame.Rect(10, y_pos, MENU_WIDTH - 20, item_height - 3)
            
            # Highlight selected item
            if i == selected_junction_index:
                pygame.draw.rect(WINDOW, BLUE, item_rect)
                text_color = WHITE
            else:
                pygame.draw.rect(WINDOW, WHITE, item_rect)
                text_color = BLACK
            
            pygame.draw.rect(WINDOW, GRAY, item_rect, 1)
            
            # Draw junction name (no ID)
            name_text = FONT_SMALL.render(junction["junctionName"][:100], True, text_color)
            name_rect = name_text.get_rect(left=item_rect.left + 8, top=item_rect.top + 8)
            WINDOW.blit(name_text, name_rect)
            
            # Draw location
            location_text = FONT_SMALL.render(junction["location"][:32], True, text_color)
            location_rect = location_text.get_rect(left=item_rect.left + 8, top=item_rect.top + 28)
            WINDOW.blit(location_text, location_rect)

def draw_info_detail():
    """Draw the bottom half of left panel - detailed junction info"""
    # Draw bottom panel background
    info_rect = pygame.Rect(0, LEFT_TOP_HEIGHT, MENU_WIDTH, LEFT_BOTTOM_HEIGHT)
    pygame.draw.rect(WINDOW, WHITE, info_rect)
    pygame.draw.rect(WINDOW, GRAY, info_rect, 2)
    
    if not simulation_running:
        # Show instruction
        instruction_text = FONT_SMALL.render("Chọn nút giao để xem thông tin", True, GRAY)
        instruction_rect = instruction_text.get_rect(center=(MENU_WIDTH // 2, LEFT_TOP_HEIGHT + LEFT_BOTTOM_HEIGHT // 2))
        WINDOW.blit(instruction_text, instruction_rect)
        return
    
    y_offset = LEFT_TOP_HEIGHT + 10
    
    # Title
    title_text = FONT_MEDIUM.render("Thông tin chi tiết", True, BLACK)
    WINDOW.blit(title_text, (10, y_offset))
    y_offset += 30
    
    # Junction name
    name_text = FONT_SMALL.render(f"Tên: {JUNCTION_NAME}", True, BLACK)
    WINDOW.blit(name_text, (10, y_offset))
    y_offset += 20
    
    # Config source
    source_text = FONT_SMALL.render(f"Nguồn: {CONFIG_SOURCE}", True, BLACK)
    WINDOW.blit(source_text, (10, y_offset))
    y_offset += 25
    
    # Schedule info
    schedule_title = FONT_SMALL.render("Lịch trình:", True, BLACK)
    WINDOW.blit(schedule_title, (10, y_offset))
    y_offset += 18
    
    with state_lock:
        # Cycle info
        cycle_text = FONT_SMALL.render(f"• Chu kỳ: {CYCLE_TIME}s", True, BLACK)
        WINDOW.blit(cycle_text, (15, y_offset))
        y_offset += 16
        
        yellow_text = FONT_SMALL.render(f"• Đèn vàng: {YELLOW_TIME}s", True, BLACK)
        WINDOW.blit(yellow_text, (15, y_offset))
        y_offset += 16
        
        all_red_text = FONT_SMALL.render(f"• Đèn đỏ chung: {ALL_RED_TIME}s", True, BLACK)
        WINDOW.blit(all_red_text, (15, y_offset))
        y_offset += 16
        
        # Calculate total red time per cycle
        total_green_yellow = 0
        for phase in PHASES:
            if phase.get("color") in ["green", "yellow"]:
                total_green_yellow += phase["duration"]
        red_time = max(0, CYCLE_TIME - total_green_yellow - ALL_RED_TIME)
        
        red_text = FONT_SMALL.render(f"• Đèn đỏ: {red_time}s", True, BLACK)
        WINDOW.blit(red_text, (15, y_offset))
        y_offset += 20
        
        # Current phase info
        current_phase_title = FONT_SMALL.render("Pha hiện tại:", True, BLACK)
        WINDOW.blit(current_phase_title, (10, y_offset))
        y_offset += 18
        
        current_phase_found = False
        for phase in PHASES:
            start_time = phase["startTime"]
            duration = phase["duration"]
            phase_end = start_time + duration
            
            if start_time <= current_time < phase_end:
                phase_info = f"• {phase['direction']} - {phase.get('color', 'red')}"
                phase_text = FONT_SMALL.render(phase_info, True, BLACK)
                WINDOW.blit(phase_text, (15, y_offset))
                y_offset += 16
                
                time_left = f"• Còn lại: {phase_end - current_time}s"
                time_text = FONT_SMALL.render(time_left, True, BLACK)
                WINDOW.blit(time_text, (15, y_offset))
                current_phase_found = True
                break
        
        if not current_phase_found:
            no_phase_text = FONT_SMALL.render("• Không xác định", True, GRAY)
            WINDOW.blit(no_phase_text, (15, y_offset))

def draw_simulation():
    """Draw the top right area - traffic light simulation"""
    global current_time
    
    # Draw simulation background (top right area only)
    sim_rect = pygame.Rect(MENU_WIDTH, 0, SIMULATION_WIDTH, RIGHT_TOP_HEIGHT)
    pygame.draw.rect(WINDOW, WHITE, sim_rect)
    pygame.draw.line(WINDOW, GRAY, (MENU_WIDTH, 0), (MENU_WIDTH, RIGHT_TOP_HEIGHT), 2)
    pygame.draw.line(WINDOW, GRAY, (MENU_WIDTH, RIGHT_TOP_HEIGHT), (WINDOW_WIDTH, RIGHT_TOP_HEIGHT), 2)
    
    if not simulation_running:
        # Show instruction to select junction
        instruction_text = FONT_MEDIUM.render("Chọn nút giao để bắt đầu mô phỏng", True, GRAY)
        instruction_rect = instruction_text.get_rect(center=(SIM_CENTER_X, SIM_CENTER_Y))
        WINDOW.blit(instruction_text, instruction_rect)
        return
    
    # Draw junction name
    junction_text = FONT_LARGE.render(f"{JUNCTION_NAME}", True, BLACK)
    junction_rect = junction_text.get_rect(center=(SIM_CENTER_X, 20))
    WINDOW.blit(junction_text, junction_rect)
    
    # Draw direction labels
    labels = ["Bắc", "Nam", "Đông", "Tây"]
    label_positions = [
        (SIM_CENTER_X, 80),  # Above horizontal lights
        (SIM_CENTER_X, RIGHT_TOP_HEIGHT - 40),  # Below horizontal lights
        (SIM_OFFSET_X + SIMULATION_WIDTH - 90, SIM_CENTER_Y - 20),  # Above horizontal lights
        (SIM_OFFSET_X + 90, SIM_CENTER_Y - 20)  # Above horizontal lights
    ]
    
    for label, pos in zip(labels, label_positions):
        text = FONT_MEDIUM.render(label, True, BLACK)
        text_rect = text.get_rect(center=pos)
        WINDOW.blit(text, text_rect)
    
    # Draw traffic lights
    for direction in LIGHT_POSITIONS:
        with state_lock:
            state = lights_state[direction]
            countdown = countdowns[direction]
        draw_traffic_light(LIGHT_POSITIONS[direction], state)
        if countdown is not None:
            countdown_text = FONT_MEDIUM.render(str(countdown), True, BLACK)
            countdown_rect = countdown_text.get_rect(center=COUNTDOWN_POSITIONS[direction])
            WINDOW.blit(countdown_text, countdown_rect)
    
    # Draw current time and cycle info
    with state_lock:
        time_text = FONT_MEDIUM.render(f"Thời gian: {current_time}s", True, BLACK)
        time_rect = time_text.get_rect(center=(SIM_CENTER_X, SIM_CENTER_Y))
        WINDOW.blit(time_text, time_rect)
        
        cycle_text = FONT_MEDIUM.render(f"Chu kỳ: {CYCLE_TIME}s", True, BLACK)
        cycle_rect = cycle_text.get_rect(center=(SIM_CENTER_X, SIM_CENTER_Y + 30))
        WINDOW.blit(cycle_text, cycle_rect)

def handle_menu_click(mouse_pos):
    """Handle mouse clicks in the menu area"""
    global selected_junction_index, simulation_running, show_info_panel, JUNCTION_ID, JUNCTION_NAME, current_time, search_active, search_text
    
    # Check if clicking on search box
    if search_box.collidepoint(mouse_pos):
        search_active = True
        return
    else:
        search_active = False
    
    # Check if clicking on stop button
    if stop_button.collidepoint(mouse_pos):
        if simulation_running:
            simulation_running = False
            show_info_panel = False
            selected_junction_index = -1
            JUNCTION_ID = ""
            JUNCTION_NAME = ""
            current_time = 0
            print("Đã dừng mô phỏng")
        return
    
    if loading_junctions or not filtered_junctions:
        return
    
    # Only handle clicks in the top half (junction list area)
    if mouse_pos[1] >= LEFT_TOP_HEIGHT:
        return
    
    y_start = 110
    item_height = 50  # Updated to match draw_menu
    visible_items = (LEFT_TOP_HEIGHT - y_start - 10) // item_height
    
    if mouse_pos[1] < y_start:
        return
    
    clicked_index = (mouse_pos[1] - y_start) // item_height + scroll_offset
    
    if 0 <= clicked_index < len(filtered_junctions):
        selected_junction_index = clicked_index
        selected_junction = filtered_junctions[clicked_index]
        
        # Update junction info
        JUNCTION_ID = selected_junction["junctionId"]
        JUNCTION_NAME = selected_junction["junctionName"]
        
        print(f"Đã chọn nút giao: {JUNCTION_NAME}")
        
        # Load configuration for selected junction
        current_time = 0
        simulation_running = True
        show_info_panel = True  # Show detailed info panel
        
        # Update window title
        pygame.display.set_caption(f"Mô phỏng đèn giao thông - {JUNCTION_NAME}")
        
        # Load config in background thread
        threading.Thread(target=lambda: load_config_from_db(sync=True), daemon=True).start()

def handle_scroll(event):
    """Handle mouse wheel scrolling in menu"""
    global scroll_offset
    
    if loading_junctions or not filtered_junctions:
        return
    
    if event.button == 4:  # Scroll up
        scroll_offset = max(0, scroll_offset - 1)
    elif event.button == 5:  # Scroll down
        available_height = LEFT_TOP_HEIGHT - 110 - 10
        visible_items = available_height // 50  # Updated to match new item height
        max_scroll = max(0, len(filtered_junctions) - visible_items)
        scroll_offset = min(max_scroll, scroll_offset + 1)

def draw_phase_chart():
    """Draw phase timing chart in bottom right area"""
    if not PHASES or CYCLE_TIME == 0:
        # Draw empty chart area
        chart_area = pygame.Rect(MENU_WIDTH, RIGHT_TOP_HEIGHT, SIMULATION_WIDTH, RIGHT_BOTTOM_HEIGHT)
        pygame.draw.rect(WINDOW, WHITE, chart_area)
        pygame.draw.rect(WINDOW, GRAY, chart_area, 2)
        
        no_data_text = FONT_MEDIUM.render("Chưa có dữ liệu biểu đồ", True, GRAY)
        no_data_rect = no_data_text.get_rect(center=(SIM_CENTER_X, RIGHT_TOP_HEIGHT + RIGHT_BOTTOM_HEIGHT // 2))
        WINDOW.blit(no_data_text, no_data_rect)
        return
    
    # Chart area setup
    chart_margin = 20
    chart_rect = pygame.Rect(
        MENU_WIDTH + chart_margin, 
        RIGHT_TOP_HEIGHT + 40,
        SIMULATION_WIDTH - 2 * chart_margin, 
        RIGHT_BOTTOM_HEIGHT - 80
    )
    
    # Draw chart background
    chart_area = pygame.Rect(MENU_WIDTH, RIGHT_TOP_HEIGHT, SIMULATION_WIDTH, RIGHT_BOTTOM_HEIGHT)
    pygame.draw.rect(WINDOW, WHITE, chart_area)
    pygame.draw.rect(WINDOW, GRAY, chart_area, 2)
    
    pygame.draw.rect(WINDOW, LIGHT_GRAY, chart_rect)
    pygame.draw.rect(WINDOW, BLACK, chart_rect, 2)
    
    # Draw title
    chart_title = FONT_MEDIUM.render("Biểu đồ thời gian các pha", True, BLACK)
    title_rect = chart_title.get_rect(centerx=SIM_CENTER_X, y=RIGHT_TOP_HEIGHT + 10)
    WINDOW.blit(chart_title, title_rect)
    
    # Calculate scale
    scale_width = chart_rect.width - 60
    if scale_width <= 0:
        return
    time_per_pixel = CYCLE_TIME / scale_width
    
    # Draw phases
    colors = {"green": GREEN, "yellow": YELLOW, "red": RED}
    directions = ["Bắc", "Nam", "Đông", "Tây"]
    
    row_height = max(20, (chart_rect.height - 20) // len(directions))
    
    for dir_idx, direction in enumerate(directions):
        y_pos = chart_rect.top + 10 + dir_idx * row_height
        
        # Draw direction label
        dir_text = FONT_SMALL.render(direction, True, BLACK)
        WINDOW.blit(dir_text, (chart_rect.left + 5, y_pos + row_height // 4))
        
        # Draw red background for entire cycle first
        red_rect = pygame.Rect(
            chart_rect.left + 50, y_pos, 
            scale_width, row_height - 5
        )
        pygame.draw.rect(WINDOW, DIM_RED, red_rect)
        
        # Draw active phases on top
        for phase in PHASES:
            if phase["direction"] == direction:
                start_x = chart_rect.left + 50 + int(phase["startTime"] / time_per_pixel)
                width = max(2, int(phase["duration"] / time_per_pixel))
                phase_rect = pygame.Rect(start_x, y_pos, width, row_height - 5)
                
                color = colors.get(phase.get("color", "red"), RED)
                pygame.draw.rect(WINDOW, color, phase_rect)
                pygame.draw.rect(WINDOW, BLACK, phase_rect, 1)
        
        pygame.draw.rect(WINDOW, BLACK, red_rect, 1)
    
    # Draw current time indicator
    with state_lock:
        current_x = chart_rect.left + 50 + int(current_time / time_per_pixel)
        pygame.draw.line(WINDOW, BLACK, 
                        (current_x, chart_rect.top), 
                        (current_x, chart_rect.bottom), 3)
    
    # Draw time labels
    time_step = max(5, CYCLE_TIME // 8)
    for i in range(0, CYCLE_TIME + 1, time_step):
        x_pos = chart_rect.left + 50 + int(i / time_per_pixel)
        if x_pos <= chart_rect.right - 20:
            time_text = FONT_SMALL.render(str(i), True, BLACK)
            time_rect = time_text.get_rect(centerx=x_pos, top=chart_rect.bottom + 5)
            WINDOW.blit(time_text, time_rect)

if __name__ == "__main__":
    print("=== MÔ PHỎNG ĐÈN GIAO THÔNG 4 PHA - GUI ===")
    print("🎮 Điều khiển:")
    print("   Click chuột: Chọn nút giao")
    print("   Scroll chuột: Cuộn danh sách nút giao")
    print("   ESC: Thoát mô phỏng")
    print("   Đóng cửa sổ: Thoát mô phỏng")
    print(f"\n🌐 API server: http://localhost:8000")
    print("   Endpoint: /traffic-light-state")
    
    # Chạy FastAPI server trong một thread riêng
    config = uvicorn.Config(app, host="0.0.0.0", port=8000, log_level="warning")
    server = uvicorn.Server(config)
    threading.Thread(target=server.run, daemon=True).start()
    
    # Chạy GUI trong main thread
    main_gui()