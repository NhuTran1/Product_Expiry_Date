import { useState } from "react";
import { scanImage } from "../services/api";

export default function UploadScanner({ onResult, onLoading }) {
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);

  function handleSelect(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function handleScan() {
    if (!file) return;

    try {
      onLoading(true);
      const result = await scanImage(file, "upload");
      onResult(result);
    } finally {
      onLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow">
      <h2 className="mb-4 text-xl font-bold">Upload ảnh sản phẩm</h2>

      <input
        type="file"
        accept="image/*"
        onChange={handleSelect}
        className="mb-4 block w-full rounded-lg border p-2"
      />

      {preview && (
        <img
          src={preview}
          alt="preview"
          className="mb-4 max-h-72 w-full rounded-xl object-contain bg-gray-100"
        />
      )}

      <button
        onClick={handleScan}
        disabled={!file}
        className="w-full rounded-xl bg-green-600 py-3 font-bold text-white disabled:bg-gray-300"
      >
        Nhận diện từ ảnh upload
      </button>
    </div>
  );
}