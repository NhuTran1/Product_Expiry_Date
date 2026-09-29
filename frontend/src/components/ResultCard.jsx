import StatusBadge from "./StatusBadge";
import VoiceAlert from "./VoiceAlert";
import { toStaticUrl } from "../services/api";

export default function ResultCard({ result }) {
    if (!result) {
        return (
            <div className="rounded-2xl bg-white p-6 text-center text-gray-500 shadow">
                Chưa có kết quả nhận diện.
            </div>
        );
    }

    const imageUrl = toStaticUrl(result.original_image_path);
    const predUrl = toStaticUrl(result.prediction_image_path);
    const roiUrl = toStaticUrl(result.roi_path);
    const reusedFromAdmin =
        result.reuse_type === "file_hash_exact" || result.reuse_type === "roi_phash_auto";
    const hasSuggestion = result.reuse_type === "roi_phash_suggest" && result.suggested_date;

    return (
        <div className="rounded-2xl bg-white p-5 shadow">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Kết quả nhận diện</h2>
                <StatusBadge status={result.status} />
            </div>

            {reusedFromAdmin && (
                <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
                    <p className="font-bold">Đã dùng kết quả quản trị viên xác nhận</p>
                    <p className="text-sm">
                        Nguồn đối chiếu: scan #{result.reuse_from_scan_id} · {result.reuse_type}
                    </p>
                </div>
            )}

            {hasSuggestion && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                    <p className="font-bold">Có gợi ý từ ảnh tương tự</p>
                    <p className="text-sm">
                        Ngày gợi ý: {result.suggested_date} · trạng thái gợi ý: {result.suggested_status}
                    </p>
                </div>
            )}

            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">
                            Hình ảnh xử lý
                        </h3>
                        <p className="text-sm text-slate-500">
                            So sánh ảnh gốc và ảnh sau khi phát hiện vùng hạn sử dụng
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-1">
                    {imageUrl && (
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                            <div className="border-b border-slate-200 bg-white px-4 py-3">
                                <p className="font-semibold text-slate-700">Ảnh gốc</p>
                                <p className="text-xs text-slate-400">Ảnh sản phẩm được tải lên</p>
                            </div>

                            <div className="flex h-72 items-center justify-center p-4">
                                <img
                                    src={imageUrl}
                                    alt="Ảnh gốc"
                                    className="max-h-full max-w-full rounded-xl object-contain"
                                />
                            </div>
                        </div>
                    )}

                    {/* {predUrl && (
                        <div className="overflow-hidden rounded-2xl border border-blue-200 bg-blue-50">
                            <div className="border-b border-blue-100 bg-white px-4 py-3">
                                <p className="font-semibold text-blue-700">Ảnh có bounding box</p>
                                <p className="text-xs text-slate-400">
                                    Vùng hạn sử dụng được YOLO phát hiện
                                </p>
                            </div>

                            <div className="flex h-72 items-center justify-center p-4">
                                <img
                                    src={predUrl}
                                    alt="Ảnh có bounding box"
                                    className="max-h-full max-w-full rounded-xl object-contain"
                                />
                            </div>
                        </div>
                    )} */}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Info label="OCR text" value={result.ocr_text || "Không đọc được"} />
                <Info label="Ngày HSD" value={result.parsed_date || "Chưa xác định"} />
                <Info label="Số ngày còn lại" value={result.days_remaining ?? "Không có"} />
                <Info label="Độ tin cậy" value={result.final_confidence ?? "Không có"} />
                <Info label="Nguồn kết quả" value={result.reuse_type || "none"} />
                <Info label="Độ lệch ROI hash" value={result.phash_distance ?? "Không có"} />
            </div>

            {result.warnings?.length > 0 && (
                <div className="mt-4 rounded-xl bg-yellow-50 p-4 text-yellow-800">
                    <p className="font-bold">Cảnh báo:</p>
                    <ul className="list-inside list-disc">
                        {result.warnings.map((w, idx) => (
                            <li key={idx}>{w}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="mt-5">
                <VoiceAlert result={result} />
            </div>
        </div>
    );
}

function Info({ label, value }) {
    return (
        <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-1 font-bold text-gray-900">{String(value)}</p>
        </div>
    );
}
