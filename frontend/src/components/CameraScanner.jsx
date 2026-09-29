import { useRef, useState } from "react";
import { scanImage } from "../services/api";

export default function CameraScanner({ onResult, onLoading }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraOn, setCameraOn] = useState(false);

  async function openCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
      },
      audio: false,
    });

    streamRef.current = stream;
    videoRef.current.srcObject = stream;
    setCameraOn(true);
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setCameraOn(false);
  }

  async function captureAndScan() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], "camera_capture.jpg", {
        type: "image/jpeg",
      });

      try {
        onLoading(true);
        const result = await scanImage(file, "camera");
        onResult(result);
      } finally {
        onLoading(false);
      }
    }, "image/jpeg", 0.95);
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow">
      <h2 className="mb-4 text-xl font-bold">Camera thông minh</h2>

      <div className="mb-4 overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="h-80 w-full object-contain"
        />
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={openCamera}
          className="rounded-xl bg-blue-600 py-3 font-bold text-white"
        >
          Mở camera
        </button>

        <button
          onClick={captureAndScan}
          disabled={!cameraOn}
          className="rounded-xl bg-green-600 py-3 font-bold text-white disabled:bg-gray-300"
        >
          Chụp & nhận diện
        </button>

        <button
          onClick={stopCamera}
          className="rounded-xl bg-gray-700 py-3 font-bold text-white"
        >
          Dừng
        </button>
      </div>
    </div>
  );
}