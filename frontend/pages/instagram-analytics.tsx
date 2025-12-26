// frontend/pages/instagram-analytics.tsx
import { useState } from "react";
import api from "../lib/axios"; // Adjust path based on your lib/axios.ts location

export default function InstagramAnalytics() {
  const [mediaId, setMediaId] = useState("");
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Replace with actual user token logic
      const token = "IGAAVTWXrRzc5BZAGFGdm1vUEprX2dKeU5OLTVkazdxeVFDc0F6dnlLUmE0Y0dwYjFoR2h0ajdhQ3pNMGhFSTBmdkZAwRjJYMm1LeW5QTHZAqLW5DYkZANdmM1UWxDc3U4dkp4ZAWtBQnFNYkxKQ3VlZAHpTR253"; 
      const res = await api.get(`/analytics/instagram/media-insights`, {
        params: { accessToken: token, mediaId: mediaId }
      });
      
      // Map API array to a key-value object for easier display
      const dataMap = res.data.data.reduce((acc: any, item: any) => {
        acc[item.name] = item.values[0].value;
        return acc;
      }, {});
      
      setInsights(dataMap);
    } catch (err) {
      alert("Error fetching insights. Check console.");
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: "Reach", value: insights?.reach || "0" },
    { title: "Likes", value: insights?.likes || "0" },
    { title: "Comments", value: insights?.comments || "0" },
    { title: "Saves", value: insights?.saved || "0" },
    { title: "Shares", value: insights?.shares || "0" },
  ];

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-semibold mb-6">Instagram Media Analytics</h1>

      {/* Input Section */}
      <form onSubmit={handleSubmit} className="mb-10 flex gap-4 bg-white p-6 rounded-xl shadow">
        <input
          type="text"
          placeholder="Enter Media ID"
          className="border p-2 rounded flex-grow"
          value={mediaId}
          onChange={(e) => setMediaId(e.target.value)}
          required
        />
        <button 
          type="submit"
          className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700"
          disabled={loading}
        >
          {loading ? "Loading..." : "Submit"}
        </button>
      </form>

      {/* Results Section */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {statCards.map((item) => (
          <div key={item.title} className="bg-white rounded-xl shadow p-5 text-center">
            <p className="text-gray-500 text-sm">{item.title}</p>
            <h3 className="text-2xl font-bold mt-2">{item.value}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}