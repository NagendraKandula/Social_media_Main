import React, { useState, useEffect } from "react";
import axios from "../lib/axios"; // Adjust path to your axios instance if needed
import styles from "../styles/Planning.module.css";

/* ─── Constants & Icons ──────────────────────────────────────── */
const PLATFORMS = {
  instagram: { label: "Instagram", color: "#E1306C", bg: "#fff0f5", border: "#f9a8c9" },
  twitter:   { label: "Twitter/X", color: "#1DA1F2", bg: "#f0f8ff", border: "#93d1f7" },
  linkedin:  { label: "LinkedIn",  color: "#0077B5", bg: "#f0f7fb", border: "#90c8e0" },
  youtube:   { label: "YouTube",   color: "#FF0000", bg: "#fff5f5", border: "#ffb3b3" },
  facebook:  { label: "Facebook",  color: "#1877F2", bg: "#f0f4ff", border: "#93aef7" },
  threads:   { label: "Threads",   color: "#000000", bg: "#f5f5f5", border: "#cccccc" },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = [
  "12 AM","1 AM","2 AM","3 AM","4 AM","5 AM","6 AM","7 AM",
  "8 AM","9 AM","10 AM","11 AM","12 PM","1 PM","2 PM","3 PM",
  "4 PM","5 PM","6 PM","7 PM","8 PM","9 PM","10 PM","11 PM"
];

const PlatformIcon = ({ platform, size = 14 }) => {
  const c = PLATFORMS[platform]?.color || "#000";
  const icons = {
    instagram: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="2" y="2" width="20" height="20" rx="5" stroke={c} strokeWidth="2" />
        <circle cx="12" cy="12" r="4" stroke={c} strokeWidth="2" />
        <circle cx="17.5" cy="6.5" r="1" fill={c} />
      </svg>
    ),
    twitter: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={c}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    linkedin: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={c}>
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    youtube: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={c}>
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
    facebook: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={c}>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    threads: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#000">
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.751-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 011.591.047c-.158-.959-.5-1.666-1.02-2.104-.685-.573-1.508-.539-2.303-.505-.341.014-.68.027-1.015.01L9.5 8.496c.314.016.629.004.967-.01.966-.04 2.062-.085 3.08.752.857.714 1.36 1.832 1.498 3.32.154-.059.305-.12.449-.185 1.953-.884 3.033-2.405 3.19-4.426.176-2.273-.577-3.967-2.235-5.033C15.047 1.957 13.667 1.5 12.2 1.5c-.019 0-.038 0-.057.001L12.186 0z" />
      </svg>
    ),
  };
  return icons[platform] || null;
};

/* ─── Post Card Component ─────────────────────────────────────── */
const PostCard = ({ post, onEdit }) => {
  const plt = PLATFORMS[post.platform] || PLATFORMS.instagram;
  
  // Safely truncate content for the title visual
  const displayTitle = post.content ? post.content.substring(0, 25) + "..." : "Media Post";

  return (
    <div
      className={styles.postCard}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("postId", String(post.id))}
      onClick={() => onEdit(post)}
      style={{ background: plt.bg, border: `1px solid ${plt.border}` }}
    >
      <div className={styles.postCardHeader}>
        <PlatformIcon platform={post.platform} size={13} />
        <span className={styles.postCardTitle}>{displayTitle}</span>
      </div>
      <div className={styles.postCardTime}>{post.hour}</div>
      <div className={styles.postCardThumbs}>
        {[0, 1, 2].map((i) => <div key={i} className={styles.postCardThumb} />)}
      </div>
    </div>
  );
};

/* ─── Modal Component ─────────────────────────────────────────── */
const Modal = ({ post, onClose, onSave, onDelete }) => {
  const [form, setForm] = useState(
    post
      ? { content: post.content, platform: post.platform, status: post.status }
      : { content: "", platform: "instagram", status: "draft" }
  );

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{post ? "Edit Post" : "Create Post"}</h3>
          <button className={styles.modalClose} onClick={onClose}>×</button>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Post Content</label>
          <textarea
            className={styles.fieldInput}
            style={{ minHeight: "100px", resize: "vertical" }}
            value={form.content}
            onChange={(e) => set("content", e.target.value)}
            placeholder="Write your post content..."
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Platform</label>
          <select className={styles.fieldInput} value={form.platform} onChange={(e) => set("platform", e.target.value)}>
            {Object.entries(PLATFORMS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Status</label>
          <select className={styles.fieldInput} value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
          </select>
        </div>

        <div className={styles.modalActions}>
          {post && (
            <button className={styles.btnDelete} onClick={() => onDelete(post.id)}>Delete</button>
          )}
          <button className={styles.btnCancel} onClick={onClose}>Cancel</button>
          <button className={styles.btnSave} onClick={() => onSave({ ...form, id: post?.id })}>Save post</button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Planning Component ─────────────────────────────────── */
const Planning = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePlatform, setActivePlatform] = useState("all");
  const [view, setView] = useState("week");
  const [modal, setModal] = useState(null);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [dragOverCell, setDragOverCell] = useState(null);

  /** --- Date Math Helpers --- */
  const getWeekDates = () => {
    const now = new Date();
    // Start at Sunday of the current adjusted week
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - now.getDay() + (currentWeekOffset * 7));
    sunday.setHours(0, 0, 0, 0);

    return DAYS.map((_, i) => {
      const dt = new Date(sunday);
      dt.setDate(sunday.getDate() + i);
      return dt;
    });
  };

  const weekDates = getWeekDates();
  const monthYear = weekDates[1].toLocaleDateString("en-US", { month: "long", year: "numeric" });
  
  // Date -> Grid (Backend to Frontend)
  const dateToGrid = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDay(); // 0-6 (Sun-Sat)
    let hourNum = date.getHours();
    const ampm = hourNum >= 12 ? "PM" : "AM";
    const displayHour = hourNum % 12 || 12;
    return { day, hour: `${displayHour} ${ampm}` };
  };

  // Grid -> Date (Frontend to Backend)
  const gridToDate = (dayIndex, hourStr, weekOffset) => {
    const now = new Date();
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - now.getDay() + (weekOffset * 7));
    
    const targetDate = new Date(sunday);
    targetDate.setDate(sunday.getDate() + dayIndex);

    const [time, modifier] = hourStr.split(" ");
    let hours = parseInt(time, 10);
    if (hours === 12) hours = 0;
    if (modifier === "PM") hours += 12;
    
    targetDate.setHours(hours, 0, 0, 0);
    return targetDate.toISOString();
  };

  /** --- API Fetching --- */
  useEffect(() => {
    fetchScheduledPosts();
  }, [currentWeekOffset]);

  const fetchScheduledPosts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/posting/scheduled?offset=${currentWeekOffset}`);
      
      const formattedPosts = response.data.map(post => ({
        id: post.id,
        platform: post.platform.toLowerCase(),
        content: post.content || "", // Safely keep full content
        status: post.status.toLowerCase(),
        ...dateToGrid(post.scheduledAt)
      }));
      setPosts(formattedPosts);
    } catch (error) {
      console.error("Failed to fetch posts", error);
    } finally {
      setLoading(false);
    }
  };

  /** --- API Handlers --- */
  const handleSave = async (form) => {
    try {
      if (modal.type === "edit") {
        await axios.patch(`/posting/${form.id}`, {
          platform: form.platform,
          status: form.status,
          content: form.content
        });
        setPosts((ps) => ps.map((p) => (p.id === form.id ? { ...p, ...form } : p)));
      } else {
        const response = await axios.post('/posting', {
          platform: form.platform,
          content: form.content,
          status: form.status,
          scheduledAt: gridToDate(1, "12 PM", currentWeekOffset) // Default drop to Mon 12 PM
        });
        setPosts((ps) => [...ps, { ...form, id: response.data.id, day: 1, hour: "12 PM" }]);
      }
      setModal(null);
    } catch (error) {
      console.error("Failed to save post", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/posting/${id}`);
      setPosts((ps) => ps.filter((p) => p.id !== id));
      setModal(null);
    } catch (error) {
      console.error("Failed to delete post", error);
    }
  };

  const handleDrop = async (e, day, hour) => {
    e.preventDefault();
    const id = parseInt(e.dataTransfer.getData("postId"), 10); // Safe Int parse

    // Optimistic UI update
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, day, hour } : p)));
    setDragOverCell(null);

    try {
      await axios.patch(`/posting/${id}/reschedule`, {
        scheduledAt: gridToDate(day, hour, currentWeekOffset)
      });
    } catch (error) {
      console.error("Failed to reschedule, reverting UI", error);
      fetchScheduledPosts();
    }
  };

  /** --- Derived State for UI --- */
  const filtered = activePlatform === "all" ? posts : posts.filter((p) => p.platform === activePlatform);
  const stats = {
    total: posts.length,
    draft: posts.filter((p) => p.status === "draft").length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    published: posts.filter((p) => p.status === "published").length,
  };

  const filterOptions = [
    { key: "all", label: "All Platforms", color: "#1a1a1a" },
    ...Object.entries(PLATFORMS).map(([k, v]) => ({ key: k, label: v.label, color: v.color })),
  ];

  return (
    <div className={styles.page}>
      
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.heading}>Social Media Content Calendar</h1>
        <button className={styles.createBtn} onClick={() => setModal({ type: "create" })}>
          <span className={styles.createBtnPlus}>+</span> Create Post
        </button>
      </div>

      {/* Stat Cards */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Posts</div>
          <div className={styles.statValue}>{stats.total}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Drafts</div>
          <div className={styles.statValue}>{stats.draft}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Scheduled</div>
          <div className={`${styles.statValue} ${styles.amber}`}>{stats.scheduled}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Published</div>
          <div className={`${styles.statValue} ${styles.green}`}>{stats.published}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <span className={styles.filterLabel}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filter by:
        </span>
        {filterOptions.map((p) => {
          const isActive = activePlatform === p.key;
          return (
            <button
              key={p.key}
              className={`${styles.filterPill} ${isActive ? styles.active : ""}`}
              style={isActive ? { background: p.color } : {}}
              onClick={() => setActivePlatform(p.key)}
            >
              {p.key !== "all" && (
                <span
                  className={styles.platformDot}
                  style={{ background: isActive ? "#fff" : p.color }}
                />
              )}
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Calendar Card */}
      <div className={styles.calendarCard}>
        {/* Toolbar */}
        <div className={styles.calToolbar}>
          <div className={styles.calToolbarLeft}>
            <span className={styles.monthLabel}>
              {monthYear.split(" ")[0]}{" "}
              <span className={styles.monthLabelYear}>{monthYear.split(" ")[1]}</span>
            </span>
            <div className={styles.navGroup}>
              <button className={styles.navArrow} onClick={() => setCurrentWeekOffset((o) => o - 1)}>‹</button>
              <button className={styles.todayBtn} onClick={() => setCurrentWeekOffset(0)}>Today</button>
              <button className={styles.navArrow} onClick={() => setCurrentWeekOffset((o) => o + 1)}>›</button>
            </div>
          </div>
          <div className={styles.viewToggle}>
            {["Day", "Week", "Month"].map((v) => (
              <button
                key={v}
                className={`${styles.viewBtn} ${view === v.toLowerCase() ? styles.active : ""}`}
                onClick={() => setView(v.toLowerCase())}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar Grid Table */}
        <div className={styles.tableWrapper}>
          <table className={styles.calTable}>
            <thead>
              <tr>
                <th className={styles.timeColHeader}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                </th>
                {DAYS.map((d, i) => {
                  const dt = weekDates[i];
                  const isToday = dt?.toDateString() === new Date().toDateString();
                  return (
                    <th key={d} className={styles.dayHeader}>
                      <span className={styles.dayName}>{d}</span>
                      <span className={`${styles.dayNum} ${isToday ? styles.today : ""}`}>
                        {dt ? dt.getDate() : ""}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((hour) => (
                <tr key={hour}>
                  <td className={styles.timeCell}>{hour}</td>
                  {DAYS.map((_, di) => {
                    const cellKey = `${di}-${hour}`;
                    const cellPosts = filtered.filter((p) => p.day === di && p.hour === hour);
                    return (
                      <td
                        key={di}
                        className={`${styles.calCell} ${dragOverCell === cellKey ? styles.dragOver : ""}`}
                        onDragOver={(e) => { e.preventDefault(); setDragOverCell(cellKey); }}
                        onDragLeave={() => setDragOverCell(null)}
                        onDrop={(e) => handleDrop(e, di, hour)}
                      >
                        {cellPosts.map((post) => (
                          <PostCard key={post.id} post={post} onEdit={(p) => setModal({ type: "edit", post: p })} />
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <Modal
          post={modal.type === "edit" ? modal.post : null}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};

export default Planning;