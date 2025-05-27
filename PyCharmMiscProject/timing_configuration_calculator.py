import random
import math

# Hệ số đơn vị PCU
PCU = {
    "xe_con": 1.0,
    "xe_may": 0.17,
    "xe_tai_nho": 1.48,
    "xe_buyt": 3.70
}

# Thông số cố định
x = 60  # Thời gian chu kỳ tối thiểu (giây)
a = 0.5  # Hệ số điều chỉnh (giây/PCU)
y = 10   # Thời gian xanh tối thiểu (giây)
yellow_time = 3  # Thời gian vàng (giây)
all_red_time = 3  # Thời gian đỏ chung (giây)
num_phases = 4   # Số pha (4 hướng)

# Tạo số lượng phương tiện ngẫu nhiên
def generate_random_vehicles():
    directions = ["Bắc", "Nam", "Đông", "Tây"]
    vehicles = {}
    low_traffic_dir = random.choice(directions)  # Chọn ngẫu nhiên hướng có lưu lượng thấp

    for direction in directions:
        if direction == low_traffic_dir:
            # Lưu lượng thấp
            vehicles[direction] = {
                "xe_con": random.randint(5, 15),
                "xe_may": random.randint(10, 30),
                "xe_tai_nho": random.randint(0, 2),
                "xe_buyt": random.randint(0, 1)
            }
        else:
            # Lưu lượng cao
            vehicles[direction] = {
                "xe_con": random.randint(50, 80),
                "xe_may": random.randint(100, 180),
                "xe_tai_nho": random.randint(5, 10),
                "xe_buyt": random.randint(2, 5)
            }
    return vehicles

# Tính hệ số ùn tắc Ci
def calculate_congestion(vehicles):
    congestion = {}
    for direction, counts in vehicles.items():
        Ci = (counts["xe_con"] * PCU["xe_con"] +
              counts["xe_may"] * PCU["xe_may"] +
              counts["xe_tai_nho"] * PCU["xe_tai_nho"] +
              counts["xe_buyt"] * PCU["xe_buyt"])
        congestion[direction] = Ci
    return congestion

# Tính thời gian chu kỳ C
def calculate_cycle_time(total_congestion):
    C = max(x, a * total_congestion)
    return math.ceil(C)  # Làm tròn lên

# Tính thời gian mất mát L
def calculate_lost_time():
    return (yellow_time + all_red_time) * num_phases

# Phân bổ thời gian đèn xanh
def allocate_green_times(congestion, total_green_time):
    preliminary_green = {}
    rounded_green = {}
    for direction, Ci in congestion.items():
        proportion = Ci / sum(congestion.values())
        preliminary_green[direction] = max(y, proportion * total_green_time)
        rounded_green[direction] = round(preliminary_green[direction])
    return preliminary_green, rounded_green

# Kiểm tra và điều chỉnh thời gian đèn xanh
def adjust_green_times(rounded_green, total_green_time):
    total_rounded = sum(rounded_green.values())
    excess = total_rounded - total_green_time
    final_green = rounded_green.copy()

    if excess > 0:
        # Các hướng có thể giảm (G > y)
        adjustable = {d: g for d, g in rounded_green.items() if g > y}
        if adjustable:
            total_adjustable = sum(adjustable.values())
            reductions = {}
            for direction, green_time in adjustable.items():
                proportion = green_time / total_adjustable
                reduction = excess * proportion
                reductions[direction] = math.floor(reduction)

            # Phân bổ phần giảm còn lại
            remaining_excess = excess - sum(reductions.values())
            if remaining_excess > 0:
                # Sắp xếp theo phần thập phân giảm dần
                fractions = {d: (r - math.floor(r)) for d, r in reductions.items()}
                sorted_dirs = sorted(fractions, key=fractions.get, reverse=True)
                for i in range(min(remaining_excess, len(sorted_dirs))):
                    reductions[sorted_dirs[i]] += 1

            # Áp dụng giảm
            for direction, reduction in reductions.items():
                final_green[direction] -= reduction

    return final_green

# Định dạng kết quả thời gian pha đèn
def format_phases(final_green):
    phase_order = ["Bắc", "Nam", "Đông", "Tây"]
    phases = []
    current_time = 0

    for direction in phase_order:
        green = final_green[direction]
        yellow_start = current_time + green
        yellow_end = yellow_start + yellow_time
        all_red_end = yellow_end + all_red_time

        phase = {
            "direction": direction,
            "green": (current_time, yellow_start),
            "yellow": (yellow_start, yellow_end),
            "all_red": (yellow_end, all_red_end)
        }
        phases.append(phase)
        current_time = all_red_end

    return phases

# In kết quả theo định dạng mẫu
def print_phases(phases):
    for phase in phases:
        direction = phase["direction"]
        green_start, green_end = phase["green"]
        yellow_start, yellow_end = phase["yellow"]
        all_red_start, all_red_end = phase["all_red"]
        print(f"{direction}: Xanh ({green_start}–{green_end}), Vàng ({yellow_start}–{yellow_end}), Đỏ chung ({all_red_start}–{all_red_end}).")

# Main script
def main():
    # Tạo dữ liệu ngẫu nhiên
    vehicles = generate_random_vehicles()
    print("Số lượng phương tiện:")
    for direction, counts in vehicles.items():
        print(f"{direction}: {counts}")

    # Tính hệ số ùn tắc
    congestion = calculate_congestion(vehicles)
    print("\nHệ số ùn tắc (PCU):")
    for direction, Ci in congestion.items():
        print(f"{direction}: {Ci:.2f} PCU")

    # Tính tổng hệ số ùn tắc
    total_congestion = sum(congestion.values())
    print(f"Tổng hệ số ùn tắc: {total_congestion:.2f} PCU")

    # Tính thời gian chu kỳ
    C = calculate_cycle_time(total_congestion)
    print(f"\nThời gian chu kỳ: {C} giây")

    # Tính thời gian mất mát
    L = calculate_lost_time()
    print(f"Thời gian mất mát: {L} giây")

    # Tính tổng thời gian đèn xanh
    total_green_time = C - L
    print(f"Tổng thời gian đèn xanh: {total_green_time} giây")

    # Phân bổ thời gian đèn xanh
    preliminary_green, rounded_green = allocate_green_times(congestion, total_green_time)
    print("\nThời gian đèn xanh sơ bộ (giây):")
    for direction, time in preliminary_green.items():
        print(f"{direction}: {time:.2f}")
    print("\nThời gian đèn xanh làm tròn (giây):")
    for direction, time in rounded_green.items():
        print(f"{direction}: {time}")

    # Kiểm tra và điều chỉnh
    final_green = adjust_green_times(rounded_green, total_green_time)
    print("\nThời gian đèn xanh cuối cùng (giây):")
    for direction, time in final_green.items():
        print(f"{direction}: {time}")

    # Định dạng và in kết quả pha đèn
    phases = format_phases(final_green)
    print("\nKết quả thời gian pha đèn:")
    print_phases(phases)

if __name__ == "__main__":
    main()