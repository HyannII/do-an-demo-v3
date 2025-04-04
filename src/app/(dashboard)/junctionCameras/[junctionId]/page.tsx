// src/app/junction-cameras/[junctionId]/page.tsx
"use client";

import React, { useEffect, useState, useRef } from "react";
import { Tree, NodeRendererProps, NodeApi } from "react-arborist";
import {
  Camera,
  Junction,
} from "@/app/(dashboard)/map/mapComponent/mapConstants";
import { Maximize2 } from "lucide-react";

// Interface cho node trong cây
interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
  type: "junction" | "camera";
  camera?: Camera;
}

const JunctionCamerasPage = ({
  params: paramsPromise,
}: {
  params: Promise<{ junctionId: string }>;
}) => {
  const params = React.use(paramsPromise);
  const [junction, setJunction] = useState<Junction | null>(null);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [selectedCameras, setSelectedCameras] = useState<Camera[]>([]);

  // Tạo mảng refs cho tối đa 4 camera
  const cameraRefs = useRef<(HTMLDivElement | null)[]>(Array(4).fill(null));

  // Lấy dữ liệu ngã tư và camera
  useEffect(() => {
    const fetchJunction = async () => {
      try {
        const response = await fetch(`/api/junctions/${params.junctionId}`);
        if (!response.ok) {
          console.error("Failed to fetch junction", response.status);
          return;
        }
        const data = await response.json();
        setJunction(data);

        // Tạo dữ liệu cho cây
        const junctionsResponse = await fetch("/api/junctions");
        const junctionsData = await junctionsResponse.json();
        const tree: TreeNode[] = junctionsData.map((j: Junction) => ({
          id: j.junctionId,
          name: j.junctionName,
          type: "junction",
          children: j.cameras?.map((camera: Camera) => ({
            id: camera.cameraId,
            name: camera.cameraName,
            type: "camera",
            camera,
          })),
        }));
        setTreeData(tree);

        // Mặc định hiển thị tất cả camera của ngã tư được chọn
        setSelectedCameras(data.cameras || []);
      } catch (error) {
        console.error("Failed to fetch junction", error);
      }
    };

    fetchJunction();
  }, [params.junctionId]);

  // Xử lý khi chọn node trong cây
  const handleNodeSelect = (nodes: NodeApi<TreeNode>[]) => {
    const selectedNode = nodes[0];
    if (!selectedNode) return;

    if (selectedNode.data.type === "junction") {
      // Chọn tất cả camera của ngã tư
      const junctionNode = treeData.find(
        (node) => node.id === selectedNode.data.id
      );
      const cameras =
        junctionNode?.children
          ?.map((child) => child.camera)
          .filter((camera): camera is Camera => camera !== undefined) || [];
      setSelectedCameras(cameras);
    } else if (selectedNode.data.type === "camera") {
      // Chọn một camera cụ thể
      if (selectedNode.data.camera) {
        setSelectedCameras([selectedNode.data.camera]);
      }
    }
  };

  // Component render node trong cây
  const Node = ({ node, style, dragHandle }: NodeRendererProps<TreeNode>) => {
    return (
      <div
        style={style}
        ref={dragHandle}
        onClick={() => node.toggle()}
      >
        <span>
          {node.isOpen ? "▼" : "▶"} {node.data.name}
        </span>
      </div>
    );
  };

  // Hàm xử lý fullscreen
  const handleFullscreen = (index: number) => {
    const element = cameraRefs.current[index];
    if (element) {
      if (element.requestFullscreen) {
        element.requestFullscreen();
      }
    }
  };

  return (
    <div className="flex h-screen">
      {/* Danh sách dạng cây */}
      <div className="w-1/4 p-4 border-r">
        <h2 className="text-xl font-bold mb-4">Danh sách ngã tư và camera</h2>
        <Tree
          data={treeData}
          onSelect={handleNodeSelect}
          width="100%"
          height={600}
          indent={24}
          rowHeight={36}
        >
          {Node}
        </Tree>
      </div>

      {/* Khu vực xem camera */}
      <div className="w-3/4 p-4">
        <h1 className="text-2xl font-bold mb-4">
          Camera tại {junction?.junctionName || "Ngã tư"}
        </h1>
        <div
          className={`grid gap-4 h-[calc(100vh-100px)] ${
            selectedCameras.length === 1 ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {selectedCameras.length === 0 ? (
            <p>Chọn một ngã tư hoặc camera để xem.</p>
          ) : (
            selectedCameras.slice(0, 4).map((camera, index) => (
              <div
                key={camera.cameraId}
                ref={(el) => {
                  cameraRefs.current[index] = el;
                }}
                className="border rounded-lg overflow-hidden relative"
              >
                <div className="flex justify-between items-center p-2 bg-gray-100">
                  <h3>{camera.cameraName}</h3>
                  <button
                    onClick={() => handleFullscreen(index)}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Toàn màn hình"
                  >
                    <Maximize2 className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                <div className="aspect-video">
                  <iframe
                    src={`http://localhost:3001/stream/${camera.cameraId}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder-camera.jpg"; // Hình ảnh thay thế nếu không tải được
                    }}
                  />
                </div>
              </div>
            ))
          )}
          {/* Điền các ô trống nếu không đủ 4 camera (chỉ áp dụng khi có nhiều hơn 1 camera) */}
          {selectedCameras.length > 1 &&
            Array.from({ length: 4 - selectedCameras.length }).map(
              (_, index) => (
                <div
                  key={`empty-${index}`}
                  className="border rounded-lg flex items-center justify-center"
                >
                  <p className="text-gray-500">Không có camera</p>
                </div>
              )
            )}
        </div>
      </div>
    </div>
  );
};

export default JunctionCamerasPage;
