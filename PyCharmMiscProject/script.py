import ffmpeg
import torch
from torchvision.models.detection import fasterrcnn_resnet50_fpn, FasterRCNN_ResNet50_FPN_Weights
from torchvision.transforms import functional as F
from torchvision.ops import nms
import numpy as np
import time
import os
import cv2

# Danh sách các lớp từ COCO liên quan đến phương tiện
COCO_CLASSES = {
    1: "person",
    2: "xe đạp",
    3: "ô tô",
    4: "xe máy",
    6: "xe buýt",
    8: "xe tải"
}

VEHICLE_CLASSES = [2, 3, 4, 6, 8]

# Kiểm tra CUDA
if not torch.cuda.is_available():
    raise RuntimeError("CUDA không khả dụng. Vui lòng kiểm tra cài đặt GPU.")

# Tải mô hình và đặt hoàn toàn trên CUDA
device = torch.device("cuda")
model = fasterrcnn_resnet50_fpn(weights=FasterRCNN_ResNet50_FPN_Weights.DEFAULT)
model.eval()
model.to(device)

# Tạo thư mục để lưu ảnh
save_folder = "Detected_Images"
if not os.path.exists(save_folder):
    os.makedirs(save_folder)

# Tạo thư mục để lưu logs
log_folder = "logs"
if not os.path.exists(log_folder):
    os.makedirs(log_folder)

# File log với timestamp
log_file = os.path.join(log_folder, f"detection_log_{time.strftime('%Y%m%d_%H%M%S')}.txt")

# Biến toàn cục để lưu ROI tự do
drawing = False
roi_defined = False
roi_points = []
temp_frame = None

# File để lưu ROI
ROI_FILE = "roi_data.txt"


# Hàm ghi log với encoding UTF-8
def write_log(message):
    with open(log_file, 'a', encoding='utf-8') as f:
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        f.write(f"[{timestamp}] {message}\n")
    print(f"[{timestamp}] {message}")


# Hàm đọc ROI từ file với encoding UTF-8
def load_roi_from_file():
    global roi_points, roi_defined
    if os.path.exists(ROI_FILE):
        with open(ROI_FILE, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            roi_points = [tuple(map(int, line.strip().split(','))) for line in lines]
            if roi_points:
                roi_defined = True
        write_log(f"Đã tải ROI từ file: {ROI_FILE}")
    else:
        write_log("Không tìm thấy file ROI, sẽ sử dụng toàn khung hình.")


# Hàm lưu ROI vào file với encoding UTF-8
def save_roi_to_file():
    with open(ROI_FILE, 'w', encoding='utf-8') as f:
        for point in roi_points:
            f.write(f"{point[0]},{point[1]}\n")
    write_log(f"Đã lưu ROI vào file: {ROI_FILE}")


# Hàm xử lý sự kiện chuột để vẽ ROI tự do
def draw_free_roi(event, x, y, flags, param):
    global drawing, roi_points, roi_defined, temp_frame
    if event == cv2.EVENT_LBUTTONDOWN:
        if not drawing:
            drawing = True
            roi_points = [(x, y)]
        else:
            roi_points.append((x, y))
            temp = temp_frame.copy()
            cv2.polylines(temp, [np.array(roi_points)], False, (0, 255, 0), 2)
            cv2.imshow("Vehicle Detection", temp)
    elif event == cv2.EVENT_RBUTTONDOWN and drawing:
        drawing = False
        roi_defined = True
        roi_points.append(roi_points[0])
        cv2.polylines(temp_frame, [np.array(roi_points)], True, (0, 255, 0), 2)
        cv2.imshow("Vehicle Detection", temp_frame)
        save_roi_to_file()


# Hàm kiểm tra xem điểm có nằm trong đa giác không
def is_point_in_polygon(point, polygon):
    return cv2.pointPolygonTest(np.array(polygon, dtype=np.int32), point, False) >= 0


# Hàm kiểm tra xem box có nằm trong ROI tự do không
def is_in_roi(box, roi_points):
    if not roi_defined:
        return True
    x1, y1, x2, y2 = box
    center_x, center_y = (x1 + x2) / 2, (y1 + y2) / 2
    return is_point_in_polygon((center_x, center_y), roi_points)


# Hàm xác định vùng dựa trên tọa độ y
def get_region(y_center, frame_height):
    region_height = frame_height / 4
    if y_center < region_height:
        return "60-80m"
    elif y_center < 2 * region_height:
        return "40-60m"
    elif y_center < 3 * region_height:
        return "20-40m"
    else:
        return "0-20m"


def detect_vehicles(frame):
    frame_height = frame.shape[0]
    img = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    img_tensor = F.to_tensor(img).unsqueeze(0).to(device)

    with torch.no_grad():
        predictions = model(img_tensor)[0]

    boxes = predictions["boxes"]
    labels = predictions["labels"]
    scores = predictions["scores"]

    keep = nms(boxes, scores, iou_threshold=0.8)
    boxes = boxes[keep]
    labels = labels[keep]
    scores = scores[keep]

    boxes_np = boxes.cpu().numpy()
    labels_np = labels.cpu().numpy()
    scores_np = scores.cpu().numpy()

    vehicle_counts = {class_id: {"0-20m": 0, "20-40m": 0, "40-60m": 0, "60-80m": 0}
                      for class_id in VEHICLE_CLASSES}

    for label, score, box in zip(labels_np, scores_np, boxes_np):
        if score >= 0.85 and label in VEHICLE_CLASSES and is_in_roi(box, roi_points):
            x1, y1, x2, y2 = map(int, box)
            y_center = (y1 + y2) / 2
            region = get_region(y_center, frame_height)
            vehicle_counts[label][region] += 1

            class_name = COCO_CLASSES[label]
            label_text = f"{class_name} ({region}): {score:.2f}"
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(frame, label_text, (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    if roi_defined:
        cv2.polylines(frame, [np.array(roi_points)], True, (0, 255, 0), 2)

    return vehicle_counts, frame


def draw_regions(frame):
    height = frame.shape[0]
    region_height = height // 4
    colors = [(255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0)]
    labels = ["60-80m", "40-60m", "20-40m", "0-20m"]

    for i in range(1, 4):
        y = i * region_height
        cv2.line(frame, (0, y), (frame.shape[1], y), colors[i - 1], 1)
        cv2.putText(frame, labels[i - 1], (10, y - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, colors[i - 1], 2)


# Chế độ: 0 - chỉ chụp ảnh (không cửa sổ), 1 - chỉ đóng khung live stream
MODE = 0  # Thay đổi giá trị này để chọn chế độ (0 hoặc 1)

prev_time = time.time()
last_save_time = time.time()
save_interval = 10

# Khởi tạo RTSP với FFmpeg
rtsp_url = "rtsp://admin:abcd888A@113.160.14.86:555/Streaming/Channels/103"
try:
    # Lấy thông tin luồng để xác định độ phân giải
    probe = ffmpeg.probe(rtsp_url)
    video_stream = next((stream for stream in probe['streams'] if stream['codec_type'] == 'video'), None)
    if video_stream is None:
        raise ValueError("Không tìm thấy luồng video trong RTSP.")
    frame_width = int(video_stream['width'])
    frame_height = int(video_stream['height'])
    write_log(f"Độ phân giải luồng: {frame_width}x{frame_height}")

    # Khởi tạo FFmpeg với TCP và buffer
    stream = ffmpeg.input(rtsp_url, rtsp_transport='tcp', buffer_size=1024000)
    stream = ffmpeg.output(stream, 'pipe:', format='rawvideo', pix_fmt='bgr24')
    process = ffmpeg.run_async(stream, pipe_stdout=True)
except ffmpeg.Error as e:
    write_log(f"Không thể kết nối đến luồng RTSP: {e.stderr.decode()}")
    exit()
except ValueError as e:
    write_log(str(e))
    exit()

# Tải ROI từ file nếu tồn tại
load_roi_from_file()

try:
    if MODE == 1:  # Chỉ tạo cửa sổ trong MODE 1
        cv2.namedWindow("Vehicle Detection")
        cv2.setMouseCallback("Vehicle Detection", draw_free_roi)

    while True:
        # Đọc dữ liệu thô từ FFmpeg
        try:
            raw_frame = process.stdout.read(frame_width * frame_height * 3)
            if not raw_frame:
                write_log("Không thể đọc khung hình từ luồng RTSP. Thoát chương trình.")
                break
        except Exception as e:
            write_log(f"Lỗi khi đọc luồng RTSP: {str(e)}")
            break

        # Chuyển dữ liệu thô thành mảng numpy và tạo bản sao có thể ghi
        frame = np.frombuffer(raw_frame, np.uint8).reshape((frame_height, frame_width, 3)).copy()
        temp_frame = frame.copy()
        draw_regions(frame)
        vehicle_counts, annotated_frame = detect_vehicles(frame)

        current_time = time.time()
        fps = 1 / (current_time - prev_time) if current_time > prev_time else 0
        prev_time = current_time

        if MODE == 1:  # Chế độ chỉ đóng khung live stream
            fps_text = f"FPS: {fps:.2f}"
            cv2.putText(annotated_frame, fps_text, (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)

            guide_text = "Nhấn trái để thêm điểm, phải để hoàn thành, 'r' để reset ROI"
            cv2.putText(annotated_frame, guide_text, (10, frame.shape[0] - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

            cv2.imshow("Vehicle Detection", annotated_frame)

            result_text = ""
            for class_id, regions in vehicle_counts.items():
                for region, count in regions.items():
                    if count > 0:
                        result_text += f"{COCO_CLASSES[class_id]} ({region}): {count}, "
            if result_text:
                write_log(result_text.rstrip(", "))
            else:
                write_log("Không phát hiện phương tiện nào trong ROI với độ chính xác > 85%")

        elif MODE == 0:  # Chế độ chỉ chụp ảnh (không cửa sổ)
            if current_time - last_save_time >= save_interval:
                timestamp = time.strftime("%Y%m%d_%H%M%S")
                save_path = os.path.join(save_folder, f"detected_frame_{timestamp}.jpg")
                cv2.imwrite(save_path, annotated_frame)
                write_log(f"Đã lưu ảnh với các phương tiện được đóng khung tại: {save_path}")

                result_text = ""
                for class_id, regions in vehicle_counts.items():
                    for region, count in regions.items():
                        if count > 0:
                            result_text += f"{COCO_CLASSES[class_id]} ({region}): {count}, "
                if result_text:
                    write_log(result_text.rstrip(", "))
                else:
                    write_log("Không phát hiện phương tiện nào trong ROI với độ chính xác > 85%")
                last_save_time = current_time

        # Xử lý phím chỉ trong MODE 1 (vì MODE 0 không có cửa sổ)
        if MODE == 1:
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('r'):
                roi_defined = False
                roi_points = []
                drawing = False
                if os.path.exists(ROI_FILE):
                    os.remove(ROI_FILE)
                    write_log(f"Đã xóa file ROI: {ROI_FILE}")
        else:  # MODE 0: Thoát bằng Ctrl+C
            time.sleep(0.1)  # Giảm tải CPU khi không hiển thị

except KeyboardInterrupt:
    write_log("Đã dừng chương trình.")
finally:
    process.stdout.close()
    process.wait()
    if MODE == 1:
        cv2.destroyAllWindows()