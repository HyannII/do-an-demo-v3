#!/usr/bin/env python3
"""
Script kiểm tra kết nối database và liệt kê các nút giao có sẵn
"""

import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_database_connection():
    """Kiểm tra kết nối database"""
    try:
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            print("❌ ERROR: DATABASE_URL không được tìm thấy trong file .env")
            return False
            
        print(f"🔗 Đang kết nối tới database...")
        conn = psycopg2.connect(
            database_url,
            sslmode="require"
        )
        cursor = conn.cursor()
        
        print("✅ Kết nối database thành công!")
        return conn, cursor
        
    except Exception as e:
        print(f"❌ Lỗi kết nối database: {e}")
        return False

def list_junctions(conn, cursor):
    """Liệt kê tất cả nút giao"""
    try:
        query = """
        SELECT "junctionId", "junctionName", "location"
        FROM "Junction"
        ORDER BY "junctionName"
        """
        cursor.execute(query)
        results = cursor.fetchall()
        
        if results:
            print(f"\n📍 Tìm thấy {len(results)} nút giao:")
            print("-" * 60)
            for i, (junction_id, name, location) in enumerate(results, 1):
                print(f"{i:2}. {name}")
                print(f"     Vị trí: {location}")
                print(f"     ID: {junction_id}")
                print()
        else:
            print("❌ Không tìm thấy nút giao nào trong database")
            
    except Exception as e:
        print(f"❌ Lỗi khi lấy danh sách nút giao: {e}")

def check_schedules(conn, cursor):
    """Kiểm tra schedule configs"""
    try:
        query = """
        SELECT j."junctionName", sc."scheduleName", sc."mode", sc."isActive"
        FROM "ScheduleConfig" sc
        JOIN "Junction" j ON sc."junctionId" = j."junctionId"
        ORDER BY j."junctionName", sc."isActive" DESC
        """
        cursor.execute(query)
        results = cursor.fetchall()
        
        if results:
            print(f"\n⏰ Tìm thấy {len(results)} schedule configs:")
            print("-" * 60)
            current_junction = None
            for junction_name, schedule_name, mode, is_active in results:
                if junction_name != current_junction:
                    print(f"\n🚦 {junction_name}:")
                    current_junction = junction_name
                
                status = "🟢 ACTIVE" if is_active else "🔴 Inactive"
                mode_text = "Tự động" if mode == "auto" else "Theo lịch"
                print(f"   - {schedule_name} ({mode_text}) - {status}")
        else:
            print("❌ Không tìm thấy schedule config nào")
            
    except Exception as e:
        print(f"❌ Lỗi khi kiểm tra schedules: {e}")

def check_traffic_patterns(conn, cursor):
    """Kiểm tra traffic patterns với thông tin chi tiết về timing configuration"""
    try:
        query = """
        SELECT j."junctionName", tp."patternName", tp."patternId",
               tp."timingConfiguration"
        FROM "TrafficPattern" tp
        JOIN "Junction" j ON tp."junctionId" = j."junctionId"
        ORDER BY j."junctionName", tp."patternName"
        """
        cursor.execute(query)
        results = cursor.fetchall()
        
        if results:
            print(f"\n🎯 Tìm thấy {len(results)} traffic patterns:")
            print("-" * 80)
            current_junction = None
            for junction_name, pattern_name, pattern_id, timing_config in results:
                if junction_name != current_junction:
                    print(f"\n🚦 {junction_name}:")
                    current_junction = junction_name
                
                print(f"\n   📋 Pattern: {pattern_name}")
                print(f"      ID: {pattern_id}")
                
                # Phân tích timing configuration
                if timing_config:
                    if "cycleDuration" in timing_config:
                        # Định dạng mới
                        cycle_time = timing_config.get("cycleDuration", "N/A")
                        yellow_time = timing_config.get("yellowTime", "N/A")
                        all_red_time = timing_config.get("allRedTime", "N/A")
                        print(f"      ⏱️  Chu kỳ: {cycle_time}s (Định dạng mới)")
                        print(f"      🟡 Vàng: {yellow_time}s, 🔴 Đỏ chung: {all_red_time}s")
                        
                        phases = timing_config.get("phases", [])
                        if phases:
                            print(f"      📊 Phases ({len(phases)}):")
                            for i, phase in enumerate(phases):
                                phase_name = phase.get("phaseName", f"Phase {i+1}")
                                start_time = phase.get("startTime", 0)
                                duration = phase.get("duration", 0)
                                is_active = phase.get("isActive", True)
                                status = "🟢 Active" if is_active else "🔴 Inactive"
                                print(f"         {i+1}. {phase_name}: {start_time}s-{start_time+duration}s ({duration}s) - {status}")
                                
                                # Hiển thị light states
                                light_states = phase.get("lightStates", {})
                                if light_states:
                                    states_str = ", ".join([f"{lid}: {state}" for lid, state in light_states.items()])
                                    print(f"            Light States: {states_str}")
                    
                    elif "cycleTime" in timing_config:
                        # Định dạng cũ
                        cycle_time = timing_config.get("cycleTime", "N/A")
                        yellow_time = timing_config.get("yellowTime", "N/A")
                        all_red_time = timing_config.get("allRedTime", "N/A")
                        print(f"      ⏱️  Chu kỳ: {cycle_time}s (Định dạng cũ)")
                        print(f"      🟡 Vàng: {yellow_time}s, 🔴 Đỏ chung: {all_red_time}s")
                        
                        phases = timing_config.get("phases", [])
                        if phases:
                            print(f"      📊 Phases ({len(phases)}):")
                            for i, phase in enumerate(phases):
                                direction = phase.get("direction", f"Direction {i+1}")
                                start_time = phase.get("startTime", 0)
                                green_time = phase.get("greenTime", 0)
                                print(f"         {i+1}. {direction}: Start {start_time}s, Green {green_time}s")
                    else:
                        print(f"      ❓ Định dạng timing configuration không xác định")
                        print(f"         Keys: {list(timing_config.keys())}")
                else:
                    print(f"      ❌ Không có timing configuration")
        else:
            print("❌ Không tìm thấy traffic pattern nào")
            
    except Exception as e:
        print(f"❌ Lỗi khi kiểm tra traffic patterns: {e}")

def check_traffic_lights(conn, cursor):
    """Kiểm tra traffic lights của các junction"""
    try:
        query = """
        SELECT j."junctionName", tl."trafficLightId", tl."location", tl."direction"
        FROM "TrafficLight" tl
        JOIN "Junction" j ON tl."junctionId" = j."junctionId"
        ORDER BY j."junctionName", tl."direction"
        """
        cursor.execute(query)
        results = cursor.fetchall()
        
        if results:
            print(f"\n🚥 Tìm thấy {len(results)} traffic lights:")
            print("-" * 60)
            current_junction = None
            for junction_name, light_id, location, direction in results:
                if junction_name != current_junction:
                    print(f"\n🚦 {junction_name}:")
                    current_junction = junction_name
                
                print(f"   🚥 {direction}: {location}")
                print(f"      ID: {light_id}")
        else:
            print("❌ Không tìm thấy traffic light nào")
            
    except Exception as e:
        print(f"❌ Lỗi khi kiểm tra traffic lights: {e}")

def test_phase_mapping(conn, cursor, junction_name=None):
    """Test mapping phases với directions cho một junction cụ thể"""
    try:
        if not junction_name:
            print("\n⚠️  Vui lòng chọn junction để test mapping:")
            # Lấy danh sách junctions
            cursor.execute('SELECT "junctionName" FROM "Junction" ORDER BY "junctionName"')
            junctions = cursor.fetchall()
            for i, (name,) in enumerate(junctions, 1):
                print(f"{i}. {name}")
            
            try:
                choice = int(input("Chọn số: ")) - 1
                if 0 <= choice < len(junctions):
                    junction_name = junctions[choice][0]
                else:
                    print("Lựa chọn không hợp lệ")
                    return
            except ValueError:
                print("Vui lòng nhập số")
                return
        
        print(f"\n🔍 Test mapping phases cho junction: {junction_name}")
        print("-" * 60)
        
        # Lấy junction ID
        cursor.execute('SELECT "junctionId" FROM "Junction" WHERE "junctionName" = %s', (junction_name,))
        result = cursor.fetchone()
        if not result:
            print(f"❌ Không tìm thấy junction: {junction_name}")
            return
        
        junction_id = result[0]
        
        # Lấy traffic lights
        cursor.execute("""
            SELECT "trafficLightId", "direction", "location"
            FROM "TrafficLight"
            WHERE "junctionId" = %s
            ORDER BY "direction"
        """, (junction_id,))
        traffic_lights = cursor.fetchall()
        
        print(f"🚥 Traffic Lights:")
        light_direction_map = {}
        for light_id, direction, location in traffic_lights:
            light_direction_map[light_id] = direction
            print(f"   {direction}: {location} (ID: {light_id})")
        
        # Lấy active schedule
        cursor.execute("""
            SELECT "scheduleName", "mode", "autoPatternId"
            FROM "ScheduleConfig"
            WHERE "junctionId" = %s AND "isActive" = true
            LIMIT 1
        """, (junction_id,))
        schedule_result = cursor.fetchone()
        
        if not schedule_result:
            print("❌ Không có active schedule")
            return
        
        schedule_name, mode, auto_pattern_id = schedule_result
        print(f"\n📅 Active Schedule: {schedule_name} (Mode: {mode})")
        
        if mode == "auto" and auto_pattern_id:
            # Lấy pattern từ autoPatternId
            cursor.execute("""
                SELECT "patternName", "timingConfiguration"
                FROM "TrafficPattern"
                WHERE "patternId" = %s
            """, (auto_pattern_id,))
            pattern_result = cursor.fetchone()
            
            if pattern_result:
                pattern_name, timing_config = pattern_result
                print(f"🎯 Auto Pattern: {pattern_name}")
                
                # Test mapping
                if "cycleDuration" in timing_config:
                    print(f"\n🔄 Phase Mapping Test (Định dạng mới):")
                    phases = timing_config.get("phases", [])
                    
                    for i, phase in enumerate(phases):
                        if not phase.get("isActive", True):
                            continue
                            
                        phase_name = phase.get("phaseName", f"Phase {i+1}")
                        start_time = phase.get("startTime", 0)
                        duration = phase.get("duration", 0)
                        light_states = phase.get("lightStates", {})
                        
                        print(f"\n   Phase {i+1}: {phase_name}")
                        print(f"   Time: {start_time}s - {start_time + duration}s ({duration}s)")
                        
                        # Tìm direction từ light states
                        mapped_direction = None
                        for light_id, state in light_states.items():
                            if state == "green" and light_id in light_direction_map:
                                mapped_direction = light_direction_map[light_id]
                                print(f"   ✅ Mapped direction: {mapped_direction} (từ light {light_id})")
                                break
                        
                        if not mapped_direction:
                            # Thử từ phase name
                            for direction in ["Bắc", "Nam", "Đông", "Tây"]:
                                if direction in phase_name:
                                    mapped_direction = direction
                                    print(f"   ⚠️  Mapped direction: {mapped_direction} (từ phase name)")
                                    break
                        
                        if not mapped_direction:
                            print(f"   ❌ Không thể map direction")
                        
                        print(f"   Light States: {light_states}")
                
                elif "cycleTime" in timing_config:
                    print(f"\n🔄 Phase Mapping Test (Định dạng cũ):")
                    phases = timing_config.get("phases", [])
                    
                    for i, phase in enumerate(phases):
                        direction = phase.get("direction", "Unknown")
                        start_time = phase.get("startTime", 0)
                        green_time = phase.get("greenTime", 0)
                        
                        print(f"   Phase {i+1}: {direction}")
                        print(f"   Time: Start {start_time}s, Green {green_time}s")
                        print(f"   ✅ Direction already mapped: {direction}")
                
            else:
                print("❌ Không tìm thấy auto pattern")
        else:
            print("⚠️  Schedule mode không phải 'auto' hoặc không có autoPatternId")
            
    except Exception as e:
        print(f"❌ Lỗi khi test mapping: {e}")

def main():
    print("=" * 60)
    print("TEST KẾT NỐI DATABASE VÀ DANH SÁCH NÚT GIAO")
    print("=" * 60)
    
    # Test database connection
    result = test_database_connection()
    if not result:
        print("\n💡 Hướng dẫn:")
        print("1. Tạo file .env trong thư mục PyCharmMiscProject")
        print("2. Thêm dòng: DATABASE_URL=postgresql://user:pass@host:port/dbname")
        print("3. Thay thế user, pass, host, port, dbname bằng thông tin thực tế")
        return
    
    conn, cursor = result
    
    try:
        # List all junctions
        list_junctions(conn, cursor)
        
        # Check schedules
        check_schedules(conn, cursor)
        
        # Check traffic patterns
        check_traffic_patterns(conn, cursor)
        
        # Check traffic lights
        check_traffic_lights(conn, cursor)
        
        # Hỏi có muốn test mapping không
        print("\n" + "="*60)
        test_mapping = input("Bạn có muốn test phase mapping cho một junction cụ thể? (y/n): ").strip().lower()
        if test_mapping == 'y' or test_mapping == 'yes':
            test_phase_mapping(conn, cursor)
        
    finally:
        cursor.close()
        conn.close()
        print("\n✅ Đã đóng kết nối database")

if __name__ == "__main__":
    main() 