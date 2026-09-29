export function speakScanResult(result) {
  if (!result) return;

  let text = "";
  const dateText = formatDateForSpeech(result.parsed_date);
  const suggestedDateText = formatDateForSpeech(result.suggested_date);
  const liveDaysRemaining = calculateDaysRemaining(result.parsed_date);
  const dayText = formatDaysForSpeech(
    liveDaysRemaining ?? result.days_remaining,
  );

  if (result.reuse_type === "file_hash_exact" || result.reuse_type === "roi_phash_auto") {
    text = `Đã tìm thấy kết quả quản trị viên xác nhận trước đó. Hạn sử dụng là ${dateText}. ${dayText}`;
  } else if (result.reuse_type === "roi_phash_suggest" && result.suggested_date) {
    text = `Hệ thống chưa chắc chắn. Có gợi ý hạn sử dụng là ${suggestedDateText}. Vui lòng nhờ quản trị viên kiểm tra lại.`;
  } else if (result.status === "valid") {
    text = `Sản phẩm còn hạn sử dụng đến ${dateText}. ${dayText}`;
  } else if (result.status === "near_expiry") {
    text = `Cảnh báo, sản phẩm sắp hết hạn. Hạn sử dụng là ${dateText}. ${dayText}`;
  } else if (result.status === "expired") {
    text = `Cảnh báo, sản phẩm đã hết hạn sử dụng. Hạn sử dụng là ${dateText}. ${dayText}`;
  } else {
    text = `Hệ thống chưa chắc chắn. Vui lòng nhờ quản trị viên kiểm tra lại hạn sử dụng.`;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "vi-VN";
  utterance.rate = 1;
  utterance.pitch = 1;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function formatDateForSpeech(value) {
  if (!value) return "chưa xác định";

  const normalized = String(value).trim();
  const isoMatch = normalized.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `ngày ${Number(day)} tháng ${Number(month)} năm ${year}`;
  }

  const localMatch = normalized.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (localMatch) {
    const [, day, month, year] = localMatch;
    return `ngày ${Number(day)} tháng ${Number(month)} năm ${year}`;
  }

  return normalized;
}

function formatDaysForSpeech(daysRemaining) {
  if (daysRemaining === null || daysRemaining === undefined) {
    return "Chưa xác định được số ngày còn lại.";
  }

  const days = Number(daysRemaining);
  if (!Number.isFinite(days)) {
    return "Chưa xác định được số ngày còn lại.";
  }
  if (days < 0) {
    return `Đã quá hạn ${Math.abs(days)} ngày.`;
  }
  if (days === 0) {
    return "Hết hạn trong hôm nay.";
  }
  return `Còn ${days} ngày nữa hết hạn.`;
}

function calculateDaysRemaining(value) {
  if (!value) return null;

  const normalized = String(value).trim();
  let year;
  let month;
  let day;

  const isoMatch = normalized.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    [, year, month, day] = isoMatch;
  } else {
    const localMatch = normalized.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (!localMatch) return null;
    [, day, month, year] = localMatch;
  }

  const expiration = new Date(Number(year), Number(month) - 1, Number(day));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return Math.ceil((expiration.getTime() - today.getTime()) / 86400000);
}

export default function VoiceAlert({ result }) {
  return (
    <button
      onClick={() => speakScanResult(result)}
      disabled={!result}
      className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
    >
      🔊 Nghe lại kết quả
    </button>
  );
}
