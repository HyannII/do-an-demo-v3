import React, { useRef, useEffect } from "react";
import { TrafficLightState } from "../types";

interface Props {
  trafficLightState: TrafficLightState | null;
  connectionFailed: boolean;
}

export default function TrafficCanvas({
  trafficLightState,
  connectionFailed,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !trafficLightState) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fixed canvas size
    const WINDOW_WIDTH = 375;
    const WINDOW_HEIGHT = 375;
    const LIGHT_RADIUS = 16;

    // Get light names from traffic light state
    const lightNames = Object.keys(trafficLightState.lights_state);
    const numLights = lightNames.length;

    // Calculate dynamic light positions based on number of lights
    const calculateLightPositions = (num: number) => {
      const positions: { [key: string]: any } = {};
      const countdownPositions: { [key: string]: number[] } = {};
      const labelPositions: { [key: string]: number[] } = {};

      // Circle radius based on number of lights
      let baseRadius = Math.min(WINDOW_WIDTH, WINDOW_HEIGHT) / 3;
      if (num <= 2) {
        baseRadius = baseRadius / 1.3 + 20;
      } else if (num === 3) {
        baseRadius = baseRadius / 1.1 + 20;
      } else {
        baseRadius = baseRadius + 20;
      }

      for (let i = 0; i < num; i++) {
        // Angle clockwise starting from 12 o'clock (270 degrees)
        const angle = (270 + (360 / num) * i) % 360;
        const angleRad = (angle * Math.PI) / 180;

        // Calculate center position of light cluster
        const centerX = WINDOW_WIDTH / 2 + Math.cos(angleRad) * baseRadius;
        const centerY = WINDOW_HEIGHT / 2 + Math.sin(angleRad) * baseRadius;

        const lightName = lightNames[i];

        // Light spacing based on number of lights
        const lightSpacing = num <= 3 ? 50 : 50;

        // Position sub-lights (red, yellow, green) based on angle
        if (angle <= 45 || angle >= 315) {
          // Top area
          positions[lightName] = {
            red: [centerX - lightSpacing, centerY],
            yellow: [centerX, centerY],
            green: [centerX + lightSpacing, centerY],
          };
          countdownPositions[lightName] = [
            centerX + lightSpacing + 45,
            centerY,
          ];
          labelPositions[lightName] = [centerX, centerY - 55];
        } else if (45 < angle && angle <= 135) {
          // Right area
          positions[lightName] = {
            red: [centerX, centerY - lightSpacing - 40],
            yellow: [centerX, centerY - 40],
            green: [centerX, centerY + lightSpacing - 40],
          };
          countdownPositions[lightName] = [centerX - 50, centerY];
          labelPositions[lightName] = [centerX + 70, centerY];
        } else if (135 < angle && angle <= 225) {
          // Bottom area
          positions[lightName] = {
            red: [centerX + lightSpacing, centerY],
            yellow: [centerX, centerY],
            green: [centerX - lightSpacing, centerY],
          };
          countdownPositions[lightName] = [
            centerX - lightSpacing - 45,
            centerY,
          ];
          labelPositions[lightName] = [centerX, centerY + 55];
        } else {
          // Left area
          positions[lightName] = {
            red: [centerX, centerY + lightSpacing + 40],
            yellow: [centerX, centerY + 40],
            green: [centerX, centerY - lightSpacing + 40],
          };
          countdownPositions[lightName] = [centerX + 50, centerY];
          labelPositions[lightName] = [centerX - 70, centerY];
        }
      }

      return { positions, countdownPositions, labelPositions };
    };

    const { positions, countdownPositions, labelPositions } =
      calculateLightPositions(numLights);

    // Colors
    const RED = "rgb(255, 0, 0)";
    const YELLOW = "rgb(255, 255, 0)";
    const GREEN = "rgb(0, 255, 0)";
    const DIM_RED = "rgb(150, 0, 0)";
    const DIM_YELLOW = "rgb(150, 150, 0)";
    const DIM_GREEN = "rgb(0, 150, 0)";
    const WHITE = "rgb(255, 255, 255)";
    const BLACK = "rgb(0, 0, 0)";

    // Clear the canvas
    ctx.fillStyle = WHITE;
    ctx.fillRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT);

    // Draw labels and lights for each light name
    ctx.font = "14px 'Cascadia Code'";
    ctx.fillStyle = BLACK;
    ctx.textAlign = "center";

    lightNames.forEach((lightName) => {
      const lightPos = positions[lightName];
      const labelPos = labelPositions[lightName];
      const countdownPos = countdownPositions[lightName];

      if (!lightPos || !labelPos || !countdownPos) return;

      // Draw light name label (truncated if too long)
      const displayName =
        lightName.length > 8 ? lightName.substring(0, 8) + "..." : lightName;
      ctx.fillText(displayName, labelPos[0], labelPos[1]);

      // Get light state
      const state = trafficLightState.lights_state[lightName] || "red";

      // Draw the lights
      ctx.beginPath();
      ctx.arc(lightPos.red[0], lightPos.red[1], LIGHT_RADIUS, 0, 2 * Math.PI);
      ctx.fillStyle = state === "red" ? RED : DIM_RED;
      ctx.fill();
      ctx.strokeStyle = BLACK;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(
        lightPos.yellow[0],
        lightPos.yellow[1],
        LIGHT_RADIUS,
        0,
        2 * Math.PI
      );
      ctx.fillStyle = state === "yellow" ? YELLOW : DIM_YELLOW;
      ctx.fill();
      ctx.strokeStyle = BLACK;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(
        lightPos.green[0],
        lightPos.green[1],
        LIGHT_RADIUS,
        0,
        2 * Math.PI
      );
      ctx.fillStyle = state === "green" ? GREEN : DIM_GREEN;
      ctx.fill();
      ctx.strokeStyle = BLACK;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw countdown
      const countdown = trafficLightState.countdowns[lightName];
      if (countdown !== null) {
        ctx.fillStyle = BLACK;
        ctx.fillText(String(countdown), countdownPos[0], countdownPos[1]);
      }
    });

    // Draw center info
    ctx.fillStyle = BLACK;
    ctx.font = "16px 'Cascadia Code'";
    ctx.fillText(
      `Thời gian: ${trafficLightState.current_time}s`,
      WINDOW_WIDTH / 2,
      WINDOW_HEIGHT / 2 - 10
    );
    ctx.fillText(
      `Số đèn: ${numLights}`,
      WINDOW_WIDTH / 2,
      WINDOW_HEIGHT / 2 + 15
    );
  }, [trafficLightState]);

  if (connectionFailed) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-600 dark:text-red-400 text-center">
          Mất kết nối, đang thử lại...
        </p>
      </div>
    );
  }

  if (!trafficLightState) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 dark:text-gray-400 text-center">
          Đang tải trạng thái đèn giao thông...
        </p>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={375}
      height={375}
      className="border border-gray-300 dark:border-gray-600 mx-auto max-w-full max-h-full object-contain"
    />
  );
}
