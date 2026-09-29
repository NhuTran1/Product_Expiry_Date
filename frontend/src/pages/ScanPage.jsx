import { useEffect, useState } from "react";
import CameraScanner from "../components/CameraScanner";
import UploadScanner from "../components/UploadScanner";
import ResultCard from "../components/ResultCard";
import { speakScanResult } from "../components/VoiceAlert";

export default function ScanPage() {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    function handleResult(data) {

        console.log(data?.ocr_text);
        console.log(data?.candidate_results);
        console.log(data?.warnings);

        setResult(data);
        setTimeout(() => speakScanResult(data), 300);
    }

    return (
        <div className="min-h-screen bg-slate-100 p-6">
            <div className="mx-auto max-w-7xl">
                <div className="mb-6">
                    <h1 className="text-3xl font-extrabold text-slate-900">
                        Smart Expiration System
                    </h1>
                    <p className="text-slate-600">
                        Quét hạn sử dụng bằng camera laptop hoặc upload ảnh sản phẩm.
                    </p>
                </div>

                {loading && (
                    <div className="mb-5 rounded-xl bg-blue-50 p-4 font-semibold text-blue-700">
                        Đang xử lý ảnh, vui lòng chờ...
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <CameraScanner onResult={handleResult} onLoading={setLoading} />
                    <UploadScanner onResult={handleResult} onLoading={setLoading} />
                </div>

                <div className="mt-6">
                    <ResultCard result={result} />
                </div>
            </div>
        </div>
    );
}