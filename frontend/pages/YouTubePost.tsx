// frontend/pages/YouTubePost.tsx
import React, { useState } from "react";
import styles from "../styles/YouTubePost.module.css";
import {
  FaYoutube,
  FaLink,
  FaPlus,
  FaSmile,
  FaHashtag,
  FaMagic,
  FaComment,
  FaShareAlt,

} from "react-icons/fa";
import apiClient from "../lib/axios";

const YouTubePost = () => {
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"VIDEO" | "SHORT">("VIDEO");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Autos & Vehicles");
  const [visibility, setVisibility] = useState("Public");
  const [postTime, setPostTime] = useState("next-available");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Placeholder user info for preview
  const username = "bantubillisiva";
  const avatarUrl = "/Limg.png"; // Ensure this exists in public/

  // Handle file selection
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!mediaUrl){
      setError("Please provide a media URL.");
      return;
    }
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const response = await apiClient.post(
        "/youtube/upload-video",
        {
          mediaUrl,
          mediaType,
          title,
          description,
          category,
          visibility,
        },
        { withCredentials: true }
      );
      setMessage(response.data.message || "Video uploaded successfully!");
    } catch (err: any) {
      setError(err.response?.data?.message || "Upload failed. Please try again.");
    }
    finally {
      setLoading(false);
    }
  };


 return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <FaYoutube className={styles.youtubeIcon} />
          <h1>YouTube Dashboard</h1>
          <p className={styles.subtitle}>
            Post Videos and Shorts using public URLs (Scalable Architecture).
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.platformSelector}>
            <div className={`${styles.platformOption} ${styles.selected}`}>
              <FaYoutube size={24} />
            </div>
          </div>

          {/* Logic: Support for both Video and Shorts */}
          <div className={styles.postType}>
            <label className={styles.radioLabel}>
              <input 
                type="radio" 
                name="mediaType" 
                value="VIDEO" 
                checked={mediaType === "VIDEO"} 
                onChange={() => setMediaType("VIDEO")}
              /> Video
            </label>
            <label className={styles.radioLabel}>
              <input 
                type="radio" 
                name="mediaType" 
                value="SHORT" 
                checked={mediaType === "SHORT"} 
                onChange={() => setMediaType("SHORT")}
              /> Short
            </label>
          </div>

          {/* Media URL Input Section */}
          <div className={styles.inputGroup}>
            <label><FaLink /> Public Media URL</label>
            <input
              type="text"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="e.g. https://cloudinary.com/my-video.mp4"
              required
            />
          </div>

          {/* Rich Text Tools */}
          <div className={styles.toolsBar}>
            <button type="button" className={styles.toolButton}><FaPlus /></button>
            <button type="button" className={styles.toolButton}><FaSmile /></button>
            <button type="button" className={styles.toolButton}><FaHashtag /></button>
            <button type="button" className={`${styles.toolButton} ${styles.aiAssistantButton}`}>
              <FaMagic /> AI Assistant
            </button>
            <span className={styles.charCount}>5000</span>
          </div>

          <div className={styles.inputGroup}>
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title"
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter video description..."
              rows={5}
            />
          </div>

          <div className={styles.doubleRow}>
            <div className={styles.inputGroup}>
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="Autos & Vehicles">Autos & Vehicles</option>
                <option value="Education">Education</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Gaming">Gaming</option>
                <option value="Music">Music</option>
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label>Visibility</label>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                <option value="Public">Public</option>
                <option value="Unlisted">Unlisted</option>
                <option value="Private">Private</option>
              </select>
            </div>
          </div>

          <div className={styles.scheduleSection}>
            <div className={styles.whenToPost}>
              <label>When to Post</label>
              <select value={postTime} onChange={(e) => setPostTime(e.target.value)}>
                <option value="next-available">Next Available</option>
                <option value="custom">Custom Date & Time</option>
              </select>
            </div>
            <div className={styles.actionButtons}>
              <button type="button" onClick={() => setShowPreview(!showPreview)} className={styles.previewButton}>
                {showPreview ? "Hide Preview" : "Preview"}
              </button>
              <button type="submit" disabled={loading} className={styles.scheduleButton}>
                {loading ? "Processing..." : "Publish to YouTube"}
              </button>
            </div>
          </div>

          {message && <p className={styles.successMessage}>{message}</p>}
          {error && <p className={styles.errorMessage}>{error}</p>}
        </form>
      </div>

      {/* Preview Panel: Dynamic based on mediaType */}
      {showPreview && (
        <div className={styles.previewPanel}>
          <h3>YouTube {mediaType === "SHORT" ? "Short" : "Video"} Preview</h3>
          <div className={mediaType === "SHORT" ? styles.shortPreviewContainer : styles.standardPreviewContainer}>
            {mediaUrl ? (
              <div className={mediaType === "SHORT" ? styles.shortPreview : styles.standardPreview}>
                <video src={mediaUrl} className={styles.previewVideoContent} muted loop playsInline controls />
                {mediaType === "SHORT" && (
                  <div className={styles.previewControls}>
                    <button className={styles.controlButton}><FaSmile /></button>
                    <button className={styles.controlButton}><FaComment /></button>
                    <button className={styles.controlButton}><FaShareAlt /></button>
                  </div>
                )}
                <div className={styles.bottomBar}>
                  <div className={styles.channelInfo}>
                    <img src={avatarUrl} alt="Channel" className={styles.avatar} />
                    <span>@{username}</span>
                  </div>
                  <div className={styles.videoInfo}>
                    <p><strong>{title || "Untitled"}</strong></p>
                    <p className={styles.descriptionPreview}>{description}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.placeholderPreview}><p>Enter a URL to see preview</p></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default YouTubePost;
