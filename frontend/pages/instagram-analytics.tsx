import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function InstagramAnalytics() {
  // Dummy data (later replace with backend API)
  const accountStats = [
    { title: "Total Followers", value: "3,281" },
    { title: "Total Posts", value: "245" },
    { title: "Engagement Rate", value: "6.2%" },
    { title: "Reach", value: "18,900" },
    { title: "Impressions", value: "45,600" }
  ];

  const postStats = [
    { title: "Likes", value: "19,855" },
    { title: "Comments", value: "661" },
    { title: "Saves", value: "412" },
    { title: "Shares", value: "298" },
    { title: "Engagement / Post", value: "7.1%" }
  ];

  const chartData = {
    labels: ["0-500", "500-1k", "1k-5k", "5k-10k", "10k+"],
    datasets: [
      {
        label: "Followers Distribution (%)",
        data: [10.4, 18.3, 32.1, 24.2, 26.2],
        backgroundColor: "#6366F1"
      }
    ]
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-semibold mb-6">Instagram Overview</h1>

      {/* ACCOUNT LEVEL */}
      <h2 className="text-lg font-medium mb-3">Account Level Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-10">
        {accountStats.map((item) => (
          <div
            key={item.title}
            className="bg-white rounded-xl shadow p-5 text-center"
          >
            <p className="text-gray-500 text-sm">{item.title}</p>
            <h3 className="text-2xl font-bold mt-2">{item.value}</h3>
          </div>
        ))}
      </div>

      {/* CHART */}
      <div className="bg-white p-6 rounded-xl shadow mb-10">
        <h3 className="text-md font-semibold mb-4">
          Distribution by Number of Followers
        </h3>
        <Bar data={chartData} />
      </div>

      {/* POST LEVEL */}
      <h2 className="text-lg font-medium mb-3">Post Level Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {postStats.map((item) => (
          <div
            key={item.title}
            className="bg-white rounded-xl shadow p-5 text-center"
          >
            <p className="text-gray-500 text-sm">{item.title}</p>
            <h3 className="text-2xl font-bold mt-2">{item.value}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}
