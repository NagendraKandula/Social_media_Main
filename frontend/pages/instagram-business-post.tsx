import React, { useState } from "react";
import axios from "axios";

const InstagramDirectPost: React.FC = () => {
  const [userId, setUserId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handlePost = async () => {
    if (!userId || !accessToken || !imageUrl) {
      setMessage("⚠️ Please fill all required fields.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // STEP 1: Create Media Container
      const createMedia = await axios.post(
        `https://graph.instagram.com/v24.0/${userId}/media`,
        null,
        {
          params: {
            image_url: imageUrl,
            caption,
            access_token: accessToken,
          },
        }
      );

      const creationId = createMedia.data.id;
      console.log("✅ Media Container ID:", creationId);

      // STEP 2: Publish the Media Container
      const publishMedia = await axios.post(
        `https://graph.instagram.com/v24.0/${userId}/media_publish`,
        null,
        {
          params: {
            creation_id: creationId,
            access_token: accessToken,
          },
        }
      );

      console.log("✅ Post Published:", publishMedia.data);
      setMessage("🎉 Post published successfully!");
    } catch (error: any) {
      console.error("❌ Post Error:", error.response?.data || error.message);
      setMessage(
        `❌ Error: ${error.response?.data?.error?.message || "Failed to post."}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "450px",
        margin: "50px auto",
        padding: "20px",
        border: "1px solid #ddd",
        borderRadius: "12px",
        boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
        fontFamily: "sans-serif",
      }}
    >
      <h2 style={{ textAlign: "center" }}>📸 Instagram Direct Post Test</h2>

      <label>Instagram User ID</label>
      <input
        type="text"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        placeholder="e.g. 25060787436941336"
        style={{ width: "100%", marginBottom: "10px" }}
      />

      <label>Access Token</label>
      <input
        type="text"
        value={accessToken}
        onChange={(e) => setAccessToken(e.target.value)}
        placeholder="Your long-lived access token"
        style={{ width: "100%", marginBottom: "10px" }}
      />

      <label>Image URL</label>
      <input
        type="text"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="https://example.com/photo.jpg"
        style={{ width: "100%", marginBottom: "10px" }}
      />

      <label>Caption</label>
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Write your caption..."
        style={{
          width: "100%",
          marginBottom: "10px",
          height: "60px",
          resize: "none",
        }}
      />

      <button
        onClick={handlePost}
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px",
          backgroundColor: "#0095F6",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        {loading ? "Posting..." : "Post to Instagram"}
      </button>

      {message && (
        <p style={{ marginTop: "15px", textAlign: "center" }}>{message}</p>
      )}
    </div>
  );
};

export default InstagramDirectPost;
