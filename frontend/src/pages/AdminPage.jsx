import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import {
  correctScan,
  getScans,
  getStats,
  toStaticUrl,
} from "../services/api";
import StatusBadge from "../components/StatusBadge";

const TABS = [
  {
    id: "needs_review",
    label: "Cần kiểm tra",
    description: "Kết quả AI chưa chắc chắn",
    icon: AlertTriangle,
    color: "text-purple-700",
  },
  {
    id: "near_expiry",
    label: "Sắp hết hạn",
    description: "Ưu tiên xử lý sớm",
    icon: Clock,
    color: "text-yellow-700",
  },
  {
    id: "valid",
    label: "Còn hạn",
    description: "Sản phẩm đang an toàn",
    icon: CheckCircle2,
    color: "text-green-700",
  },
  {
    id: "expired",
    label: "Đã hết hạn",
    description: "Cần loại khỏi quầy",
    icon: XCircle,
    color: "text-red-700",
  },
];

const CHART_STATUSES = [
  {
    id: "valid",
    label: "Còn hạn",
    barClass: "bg-emerald-600",
    textClass: "text-emerald-700",
    dotClass: "bg-emerald-600",
  },
  {
    id: "near_expiry",
    label: "Sắp hết hạn",
    barClass: "bg-amber-500",
    textClass: "text-amber-700",
    dotClass: "bg-amber-500",
  },
  {
    id: "expired",
    label: "Đã hết hạn",
    barClass: "bg-rose-600",
    textClass: "text-rose-700",
    dotClass: "bg-rose-600",
  },
  {
    id: "needs_review",
    label: "Cần kiểm tra",
    barClass: "bg-violet-600",
    textClass: "text-violet-700",
    dotClass: "bg-violet-600",
  },
];

const RANGE_OPTIONS = [
  { id: "today", label: "Hôm nay" },
  { id: "7d", label: "7 ngày qua" },
  { id: "30d", label: "30 ngày qua" },
  { id: "custom", label: "Tùy chọn" },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("needs_review");
  const [showHistory, setShowHistory] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [dateRange, setDateRange] = useState("7d");
  const [customRange, setCustomRange] = useState({
    start_date: "",
    end_date: "",
  });
  const [stats, setStats] = useState(null);
  const [recordsByStatus, setRecordsByStatus] = useState({
    needs_review: [],
    near_expiry: [],
    valid: [],
    expired: [],
  });
  const [historyRecords, setHistoryRecords] = useState([]);
  const [correcting, setCorrecting] = useState({});
  const [loading, setLoading] = useState(false);

  const filters = useMemo(
    () => buildDateFilters(dateRange, customRange),
    [dateRange, customRange],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const requestFilters = {
        ...filters,
        limit: 200,
      };
      const [summary, review, nearExpiry, valid, expired, history] = await Promise.all([
        getStats(filters),
        getScans("needs_review", requestFilters),
        getScans("near_expiry", requestFilters),
        getScans("valid", requestFilters),
        getScans("expired", requestFilters),
        getScans(null, requestFilters),
      ]);

      setStats(summary);
      setRecordsByStatus({
        needs_review: review,
        near_expiry: nearExpiry,
        valid,
        expired,
      });
      setHistoryRecords(history);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  async function handleCorrect(item) {
    const value = correcting[item.id] || item.suggested_date;

    if (!value) {
      alert("Vui lòng nhập ngày đúng theo định dạng YYYY-MM-DD");
      return;
    }

    await correctScan(item.id, value, "Admin cập nhật thủ công");
    setCorrecting((current) => ({ ...current, [item.id]: "" }));
    await loadData();
  }

  const activeConfig = useMemo(
    () => TABS.find((tab) => tab.id === activeTab) || TABS[0],
    [activeTab],
  );
  const records = showHistory ? historyRecords : recordsByStatus[activeTab] || [];
  const ActiveIcon = activeConfig.icon;

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <LayoutDashboard className="h-8 w-8 text-blue-700" />
              <h1 className="text-3xl font-extrabold text-slate-900">Admin Dashboard</h1>
            </div>
            <p className="mt-1 text-slate-600">
              Quản lý kết quả quét, kiểm duyệt các trường hợp chưa chắc chắn và theo dõi hạn sử dụng.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowChart((current) => !current)}
              className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 font-semibold shadow-sm ${
                showChart
                  ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              {showChart ? "Ẩn biểu đồ" : "Xem biểu đồ"}
            </button>
            <button
              onClick={loadData}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Tải lại
            </button>
          </div>
        </div>

        <HistoryFilters
          dateRange={dateRange}
          customRange={customRange}
          showHistory={showHistory}
          onDateRangeChange={setDateRange}
          onCustomRangeChange={setCustomRange}
          onToggleHistory={() => setShowHistory((current) => !current)}
        />

        <Stats stats={stats} activeTab={activeTab} onSelect={setActiveTab} />

        {showChart && <StatusBarChart stats={stats} />}

        <div className="mt-6">
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {showHistory ? (
                    <CalendarDays className="h-5 w-5 text-blue-700" />
                  ) : (
                    <ActiveIcon className={`h-5 w-5 ${activeConfig.color}`} />
                  )}
                  <h2 className="text-xl font-bold text-slate-900">
                    {showHistory ? "Lịch sử quét" : activeConfig.label}
                  </h2>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {showHistory
                    ? "Tất cả bản ghi trong khoảng thời gian đang chọn."
                    : activeConfig.description}
                </p>
              </div>

              <div className="text-sm font-semibold text-slate-600">
                {records.length} bản ghi
              </div>
            </div>

            <ScanTable
              activeTab={showHistory ? "history" : activeTab}
              records={records}
              correcting={correcting}
              onCorrectingChange={setCorrecting}
              onCorrect={handleCorrect}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

function HistoryFilters({
  dateRange,
  customRange,
  showHistory,
  onDateRangeChange,
  onCustomRangeChange,
  onToggleHistory,
}) {
  return (
    <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => onDateRangeChange(option.id)}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                dateRange === option.id
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {dateRange === "custom" && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="date"
                value={customRange.start_date}
                onChange={(event) =>
                  onCustomRangeChange({ ...customRange, start_date: event.target.value })
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={customRange.end_date}
                onChange={(event) =>
                  onCustomRangeChange({ ...customRange, end_date: event.target.value })
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          )}

          <button
            onClick={onToggleHistory}
            className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 font-semibold shadow-sm ${
              showHistory
                ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            {showHistory ? "Ẩn lịch sử" : "Xem lịch sử quét"}
          </button>
        </div>
      </div>
    </section>
  );
}

function Stats({ stats, activeTab, onSelect }) {
  const items = [
    ["needs_review", "Cần kiểm tra", stats?.needs_review ?? 0, "bg-purple-600", ShieldAlert],
    ["near_expiry", "Sắp hết hạn", stats?.near_expiry ?? 0, "bg-yellow-500", Clock],
    ["valid", "Còn hạn", stats?.valid ?? 0, "bg-green-600", CheckCircle2],
    ["expired", "Đã hết hạn", stats?.expired ?? 0, "bg-red-600", XCircle],
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(([id, label, value, color, Icon]) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          className={`rounded-xl p-5 text-left text-white shadow-sm transition ${color} ${
            activeTab === id ? "ring-4 ring-blue-200" : "hover:brightness-95"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold opacity-90">{label}</p>
            <Icon className="h-5 w-5 opacity-90" />
          </div>
          <p className="mt-3 text-3xl font-extrabold">{value}</p>
        </button>
      ))}
    </div>
  );
}

function StatusBarChart({ stats }) {
  const total = stats?.total ?? 0;
  const chartItems = CHART_STATUSES.map((item) => {
    const value = stats?.[item.id] ?? 0;
    const percent = total > 0 ? Math.round((value / total) * 100) : 0;

    return {
      ...item,
      value,
      percent,
    };
  });
  const maxItem = chartItems.reduce(
    (currentMax, item) => (item.value > currentMax.value ? item : currentMax),
    chartItems[0],
  );

  return (
    <section className="mt-5 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Tỷ lệ trạng thái</h2>
            <p className="text-sm text-slate-500">Phân bổ kết quả quét theo khoảng thời gian đang chọn.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tổng lượt quét</p>
            <p className="text-2xl font-extrabold text-slate-900">{total}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-500">Nhóm cao nhất</p>
          <p className={`mt-2 text-3xl font-extrabold ${maxItem?.textClass || "text-slate-900"}`}>
            {total > 0 ? `${maxItem.percent}%` : "0%"}
          </p>
          <p className="mt-1 font-bold text-slate-900">{total > 0 ? maxItem.label : "Chưa có dữ liệu"}</p>
          <p className="mt-1 text-sm text-slate-500">
            {total > 0 ? `${maxItem.value} bản ghi trong bộ lọc hiện tại` : "Biểu đồ sẽ cập nhật sau khi có lượt quét."}
          </p>

          <div className="mt-5 space-y-3">
            {chartItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.dotClass}`} />
                  <span className="truncate font-semibold text-slate-700">{item.label}</span>
                </div>
                <span className="font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </aside>

        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            <div className="relative h-72 border-l border-b border-slate-300 pl-4">
              {[0, 25, 50, 75, 100].map((tick) => (
                <div
                  key={tick}
                  className="absolute left-0 right-0 border-t border-dashed border-slate-200"
                  style={{ bottom: `${tick}%` }}
                >
                  <span className="absolute -left-12 -top-2 text-xs font-semibold text-slate-400">
                    {tick}%
                  </span>
                </div>
              ))}

              <div className="relative z-10 grid h-full grid-cols-4 items-end gap-5 px-4">
                {chartItems.map((item) => (
                  <div key={item.id} className="flex h-full flex-col items-center justify-end">
                    <div className="mb-2 text-center">
                      <p className="text-lg font-extrabold text-slate-900">{item.percent}%</p>
                      <p className="text-xs font-semibold text-slate-500">{item.value} bản ghi</p>
                    </div>
                    <div className="flex h-48 w-full max-w-20 items-end rounded-t-lg bg-slate-100 ring-1 ring-inset ring-slate-200">
                      <div
                        className={`w-full rounded-t-lg shadow-sm transition-all ${item.barClass}`}
                        style={{ height: `${Math.max(item.percent, item.value > 0 ? 6 : 0)}%` }}
                        title={`${item.label}: ${item.percent}%`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-5 px-8 pt-3">
              {chartItems.map((item) => (
                <div key={item.id} className="text-center">
                  <p className="text-sm font-bold text-slate-800">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ScanTable({ activeTab, records, correcting, onCorrectingChange, onCorrect }) {
  const isReview = activeTab === "needs_review";
  const sortedRecords = [...records].sort((left, right) => {
    const leftDays = calculateDaysRemaining(left.parsed_date);
    const rightDays = calculateDaysRemaining(right.parsed_date);

    if (leftDays === null && rightDays === null) return 0;
    if (leftDays === null) return 1;
    if (rightDays === null) return -1;
    return leftDays - rightDays;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b bg-slate-50 text-sm text-slate-600">
            <th className="p-3">ID</th>
            <th className="p-3">Ảnh</th>
            <th className="p-3">Trạng thái</th>
            <th className="p-3">Ngày HSD</th>
            <th className="p-3">Còn lại</th>
            <th className="p-3">OCR / Gợi ý</th>
            <th className="p-3">Nguồn</th>
            {isReview && <th className="p-3">Admin sửa</th>}
          </tr>
        </thead>
        <tbody>
          {sortedRecords.map((item) => {
            const liveDays = calculateDaysRemaining(item.parsed_date);

            return (
            <tr key={item.id} className="border-b align-top hover:bg-slate-50">
              <td className="p-3 font-semibold text-slate-700">#{item.id}</td>
              <td className="p-3">
                {item.original_image_path ? (
                  <img
                    src={toStaticUrl(item.original_image_path)}
                    className="h-20 w-20 rounded-lg bg-slate-100 object-cover"
                  />
                ) : (
                  <span className="text-sm text-slate-400">Không có ảnh</span>
                )}
              </td>
              <td className="p-3">
                <StatusBadge status={item.status} />
              </td>
              <td className="p-3 font-semibold text-slate-800">
                {item.parsed_date || "Chưa xác định"}
              </td>
              <td className="p-3">{formatDays(liveDays)}</td>
              <td className="max-w-xs p-3 text-sm text-slate-700">
                <p className="line-clamp-2">{item.ocr_text || "Không đọc được OCR"}</p>
                {item.suggested_date && (
                  <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
                    <p className="font-bold">Gợi ý: {item.suggested_date}</p>
                    <p className="text-xs">{item.suggested_status}</p>
                  </div>
                )}
              </td>
              <td className="p-3 text-sm text-slate-600">
                <p className="font-semibold">{item.reuse_type || "none"}</p>
                {item.reuse_from_scan_id && <p>Từ scan #{item.reuse_from_scan_id}</p>}
                {item.phash_distance !== null && item.phash_distance !== undefined && (
                  <p>pHash: {item.phash_distance}</p>
                )}
              </td>
              {isReview && (
                <td className="p-3">
                  <div className="flex min-w-56 gap-2">
                    <input
                      type="date"
                      value={correcting[item.id] || item.suggested_date || ""}
                      onChange={(event) =>
                        onCorrectingChange({
                          ...correcting,
                          [item.id]: event.target.value,
                        })
                      }
                      className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2"
                    />
                    <button
                      onClick={() => onCorrect(item)}
                      className="rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-700"
                    >
                      Lưu
                    </button>
                  </div>
                </td>
              )}
            </tr>
            );
          })}

          {sortedRecords.length === 0 && (
            <tr>
              <td
                colSpan={isReview ? 8 : 7}
                className="p-8 text-center font-semibold text-slate-500"
              >
                Không có bản ghi trong nhóm này.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function formatDays(days) {
  if (days === null || days === undefined) return "Không có";
  if (days < 0) return `Quá hạn ${Math.abs(days)} ngày`;
  if (days === 0) return "Hết hạn hôm nay";
  return `Còn ${days} ngày`;
}

function calculateDaysRemaining(value) {
  if (!value) return null;

  const match = String(value).match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
  const expiration = new Date(Number(year), Number(month) - 1, Number(day));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return Math.ceil((expiration.getTime() - today.getTime()) / 86400000);
}

function buildDateFilters(range, customRange) {
  const today = new Date();
  const endDate = formatDateInput(today);
  const start = new Date(today);

  if (range === "today") {
    return { start_date: endDate, end_date: endDate };
  }

  if (range === "7d") {
    start.setDate(today.getDate() - 6);
    return { start_date: formatDateInput(start), end_date: endDate };
  }

  if (range === "30d") {
    start.setDate(today.getDate() - 29);
    return { start_date: formatDateInput(start), end_date: endDate };
  }

  return {
    ...(customRange.start_date ? { start_date: customRange.start_date } : {}),
    ...(customRange.end_date ? { end_date: customRange.end_date } : {}),
  };
}

function formatDateInput(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
