export default function StatusBadge({ status }) {
  const config = {
    valid: {
      text: "CÒN HẠN",
      className: "bg-green-100 text-green-700 border-green-300",
    },
    near_expiry: {
      text: "SẮP HẾT HẠN",
      className: "bg-yellow-100 text-yellow-800 border-yellow-300",
    },
    expired: {
      text: "ĐÃ HẾT HẠN",
      className: "bg-red-100 text-red-700 border-red-300",
    },
    needs_review: {
      text: "CẦN KIỂM TRA",
      className: "bg-purple-100 text-purple-700 border-purple-300",
    },
  };

  const item = config[status] || config.needs_review;

  return (
    <span className={`inline-flex rounded-full border px-4 py-1 text-sm font-bold ${item.className}`}>
      {item.text}
    </span>
  );
}