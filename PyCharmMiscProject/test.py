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
            "countdowns": countdowns.copy()
        }

# Hàm kết nối và đọc dữ liệu từ PostgreSQL (có thể chạy đồng bộ hoặc bất đồng bộ)
def load_config_from_db(sync=True):
    global new_config, CYCLE_TIME, YELLOW_TIME, ALL_RED_TIME, PHASES, phase_starts, green_times
    try:
        # Lấy DATABASE_URL từ biến môi trường
        database_url = os.getenv("DATABASE_URL")
        print(f"{'Main thread' if sync else 'Worker thread'} - Loaded DATABASE_URL: {database_url}")
        if not database_url:
            raise ValueError("DATABASE_URL không được tìm thấy trong biến môi trường")

        # Kết nối tới database
        conn = psycopg2.connect(
            database_url,
            sslmode="require"  # Đảm bảo sử dụng SSL
        )
        cursor = conn.cursor()

        current_hour = datetime.now().hour

        query = """
        SELECT "timingConfiguration"
        FROM "TrafficPattern"
        WHERE "junctionId" = '71862a02-471b-4e77-867d-aa66e8e77c4b'
        AND ("timingConfiguration"->'activeTime'->>'startHour')::integer <= %s
        AND ("timingConfiguration"->'activeTime'->>'endHour')::integer > %s
        LIMIT 1
        """
        cursor.execute(query, (current_hour, current_hour))
        result = cursor.fetchone()

        if result:
            config = result[0]
            config_data = {
                "CYCLE_TIME": config["cycleTime"],
                "YELLOW_TIME": config["yellowTime"],
                "ALL_RED_TIME": config["allRedTime"],
                "PHASES": config["phases"]
            }
            if sync:
                # Cập nhật trực tiếp nếu chạy đồng bộ
                with state_lock:
                    CYCLE_TIME = config_data["CYCLE_TIME"]
                    YELLOW_TIME = config_data["YELLOW_TIME"]
                    ALL_RED_TIME = config_data["ALL_RED_TIME"]
                    PHASES = config_data["PHASES"]
                    phase_starts = {phase["direction"]: phase["startTime"] for phase in PHASES}
                    green_times = {phase["direction"]: phase["greenTime"] for phase in PHASES}
                print(f"Main thread - Đã đọc cấu hình từ cơ sở dữ liệu PostgreSQL tại {datetime.now()}. CYCLE_TIME: {CYCLE_TIME}s")
            else:
                # Lưu vào new_config nếu chạy bất đồng bộ
                with config_lock:
                    new_config = config_data
                print(f"Worker thread - Đã đọc cấu hình từ cơ sở dữ liệu PostgreSQL tại {datetime.now()}. CYCLE_TIME: {new_config['CYCLE_TIME']}s")
        else:
            print(f"{'Main thread' if sync else 'Worker thread'} - Không tìm thấy traffic pattern phù hợp. Sử dụng giá trị mặc định.")
            config_data = {
                "CYCLE_TIME": 60,
                "YELLOW_TIME": 3,
                "ALL_RED_TIME": 2,
                "PHASES": [
                    {"startTime": 0, "direction": "Bắc", "greenTime": 25},
                    {"startTime": 30, "direction": "Nam", "greenTime": 25},
                    {"startTime": 0, "direction": "Đông", "greenTime": 25},
                    {"startTime": 30, "direction": "Tây", "greenTime": 25}
                ]
            }
            if sync:
                with state_lock:
                    CYCLE_TIME = config_data["CYCLE_TIME"]
                    YELLOW_TIME = config_data["YELLOW_TIME"]
                    ALL_RED_TIME = config_data["ALL_RED_TIME"]
                    PHASES = config_data["PHASES"]
                    phase_starts = {phase["direction"]: phase["startTime"] for phase in PHASES}
                    green_times = {phase["direction"]: phase["greenTime"] for phase in PHASES}
            else:
                with config_lock:
                    new_config = config_data

        cursor.close()
        conn.close()
    except psycopg2.Error as e:
        print(f"{'Main thread' if sync else 'Worker thread'} - Lỗi kết nối cơ sở dữ liệu: {e}")
        print(f"{'Main thread' if sync else 'Worker thread'} - Error code: {e.pgcode}, Error message: {e.pgerror}")
        config_data = {
            "CYCLE_TIME": 60,
            "YELLOW_TIME": 3,
            "ALL_RED_TIME": 2,
            "PHASES": [
                {"startTime": 0, "direction": "Bắc", "greenTime": 25},
                {"startTime": 30, "direction": "Nam", "greenTime": 25},
                {"startTime": 0, "direction": "Đông", "greenTime": 25},
                {"startTime": 30, "direction": "Tây", "greenTime": 25}
            ]
        }
        if sync:
            with state_lock:
                CYCLE_TIME = config_data["CYCLE_TIME"]
                YELLOW_TIME = config_data["YELLOW_TIME"]
                ALL_RED_TIME = config_data["ALL_RED_TIME"]
                PHASES = config_data["PHASES"]
                phase_starts = {phase["direction"]: phase["startTime"] for phase in PHASES}
                green_times = {phase["direction"]: phase["greenTime"] for phase in PHASES}
        else:
            with config_lock:
                new_config = config_data
    except Exception as e:
        print(f"{'Main thread' if sync else 'Worker thread'} - Lỗi không xác định khi đọc từ cơ sở dữ liệu: {e}")
        config_data = {
            "CYCLE_TIME": 60,
            "YELLOW_TIME": 3,
            "ALL_RED_TIME": 2,
            "PHASES": [
                {"startTime": 0, "direction": "Bắc", "greenTime": 25},
                {"startTime": 30, "direction": "Nam", "greenTime": 25},
                {"startTime": 0, "direction": "Đông", "greenTime": 25},
                {"startTime": 30, "direction": "Tây", "greenTime": 25}
            ]
        }
        if sync:
            with state_lock:
                CYCLE_TIME = config_data["CYCLE_TIME"]
                YELLOW_TIME = config_data["YELLOW_TIME"]
                ALL_RED_TIME = config_data["ALL_RED_TIME"]
                PHASES = config_data["PHASES"]
                phase_starts = {phase["direction"]: phase["startTime"] for phase in PHASES}
                green_times = {phase["direction"]: phase["greenTime"] for phase in PHASES}
        else:
            with config_lock:
                new_config = config_data

# Hàm cập nhật cấu hình từ new_config
def update_config():
    global new_config, CYCLE_TIME, YELLOW_TIME, ALL_RED_TIME, PHASES, phase_starts, green_times
    with config_lock:
        if new_config is not None:
            with state_lock:
                CYCLE_TIME = new_config["CYCLE_TIME"]
                YELLOW_TIME = new_config["YELLOW_TIME"]
                ALL_RED_TIME = new_config["ALL_RED_TIME"]
                PHASES = new_config["PHASES"]
                phase_starts = {phase["direction"]: phase["startTime"] for phase in PHASES}
                green_times = {phase["direction"]: phase["greenTime"] for phase in PHASES}
            print(f"Main thread - Cập nhật cấu hình mới. CYCLE_TIME: {CYCLE_TIME}s")
            # Reset new_config để tránh cập nhật lại
            new_config = None

# Đọc cấu hình lần đầu tiên (đồng bộ)
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
FONT = pygame.font.SysFont("Arial", 30)

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
            lights_state = {direction: "red" for direction in phase_starts}
            countdowns = {direction: None for direction in phase_starts}

            for direction, start_time in phase_starts.items():
                green_time = green_times[direction]
                green_end = start_time + green_time
                yellow_end = green_end + YELLOW_TIME
                all_red_end = yellow_end + ALL_RED_TIME

                if start_time <= current_time < green_end:
                    lights_state[direction] = "green"
                    countdowns[direction] = green_end - current_time
                elif green_end <= current_time < yellow_end:
                    lights_state[direction] = "yellow"
                    countdowns[direction] = yellow_end - current_time
                else:
                    lights_state[direction] = "red"
                    if current_time >= yellow_end:
                        if current_time < all_red_end:
                            time_to_next_phase = (all_red_end - current_time) + (CYCLE_TIME - all_red_end + start_time)
                        else:
                            time_to_next_phase = CYCLE_TIME - current_time + start_time
                    else:
                        time_to_next_phase = start_time - current_time

                    if time_to_next_phase <= 0:
                        time_to_next_phase += CYCLE_TIME
                    countdowns[direction] = time_to_next_phase

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
        time_rect = time_text.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2))
        WINDOW.blit(time_text, time_rect)

        pygame.display.flip()
        clock.tick(1)

if __name__ == "__main__":
    print("Bắt đầu mô phỏng đèn giao thông 4 pha...")
    print("Nhấn Esc để thoát.")
    # Chạy FastAPI server trong một thread riêng
    config = uvicorn.Config(app, host="0.0.0.0", port=8000)
    server = uvicorn.Server(config)
    threading.Thread(target=server.run, daemon=True).start()
    # Chạy mô phỏng trong main thread
    traffic_light_simulation()