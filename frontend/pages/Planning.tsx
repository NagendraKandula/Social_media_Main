import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "../lib/axios";
import styles from "../styles/Planning.module.css";

// --- Imported Publish Components & Hooks ---
import ChannelSelector, { Channel } from '../components/ChannelSelector';
import ContentEditor from '../components/ContentEditor';
import PlatformFields, { PlatformState } from '../components/PlatformFields';
import AIAssistant from '../components/AIAssistant';
import { resolveEditorRules } from '../utils/resolveEditorRules';
import { usePostCreation } from '../hooks/usePostCreation';

/* ─── Constants & Icons ──────────────────────────────────────── */
const PLATFORMS: Record<string, any> = {
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

const PlatformIcon = ({ platform, size = 14 }: any) => {
  const c = PLATFORMS[platform]?.color || "#000";
  const icons: Record<string, any> = {
    instagram: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="2" y="2" width="20" height="20" rx="5" stroke={c} strokeWidth="2" />
        <circle cx="12" cy="12" r="4" stroke={c} strokeWidth="2" />
        <circle cx="17.5" cy="6.5" r="1" fill={c} />
      </svg>
    ),
    facebook: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={c}>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    // (Other icons omitted for brevity, but they will work based on your CSS/Imports)
  };
  return icons[platform] || <div style={{ width: size, height: size, background: c, borderRadius: '50%' }} />;
};

/* ─── TIMEZONE HELPER ────────────────────────────────────────── */
// 🔥 FIX 1: This securely converts UTC database time to your Local IST Time!
const toLocalInput = (dateStr: string) => {
  const d = new Date(dateStr);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

/* ─── Post Card Component ────────────────────────────────────── */
const PostCard = ({ post, onEdit }: any) => {
  const plt = PLATFORMS[post.platform] || PLATFORMS.instagram;
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

/* ─── Advanced Schedule Modal ────────────────────────────────── */
const AdvancedScheduleModal = ({ post, initialDate, onClose, onSave, onDelete }: any) => {
  const [content, setContent] = useState(post?.content || '');
  const [files, setFiles] = useState<File[]>([]);
  
  const [selectedChannels, setSelectedChannels] = useState<Set<Channel>>(
    new Set(post?.platforms ? post.platforms : (post?.platform ? [post.platform as Channel] : []))
  );

  const [rightTab, setRightTab] = useState<'ai' | 'preview'>('ai');
  
  const [platformState, setPlatformState] = useState<PlatformState>(
    post?.contentMetadata?.platformOverrides?.[post?.platforms?.[0] || post?.platform] || {
      facebookPostType: 'feed',
      instagramPostType: 'post',
      youtubeType: 'video',
    }
  );

  // 🔥 FIX 1 APPLIED: We safely wrap the database time in the 'toLocalInput' function
  const [scheduleDate, setScheduleDate] = useState(() => {
    if (post?.scheduledAt) return toLocalInput(post.scheduledAt);
    return initialDate || '';
  });

  const [facebookPages, setFacebookPages] = useState([]);
  const [accounts, setAccounts] = useState({});

  // Get current local time to prevent past scheduling
  const currentLocalTime = toLocalInput(new Date().toISOString());

  useEffect(() => {
    axios.get('/auth/social/active-accounts').then((res) => setAccounts(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedChannels.has('facebook')) {
      axios.get('/facebook/pages').then(({ data }) => setFacebookPages(data)).catch(console.error);
    }
  }, [selectedChannels]);

  const selectedChannelList = Array.from(selectedChannels);
  const effectiveRules = resolveEditorRules(selectedChannelList);

  const handleSubmit = (status: 'DRAFT' | 'SCHEDULED') => {
    if (selectedChannels.size === 0) return alert('Select at least one channel.');
    if (!content && files.length === 0 && !post?.mediaUrl) return alert('Add content or media.');
    if (status === 'SCHEDULED' && !scheduleDate) return alert('Please select a date and time.');

    if (status === 'SCHEDULED' && new Date(scheduleDate) < new Date()) {
       return alert('You cannot schedule a post in the past.');
    }

    const platformOverrides: any = {};
    if (selectedChannels.has('facebook')) {
      platformOverrides.facebook = {
        pageId: platformState.facebookPageId,
        postType: platformState.facebookPostType,
      };
    }
    if (selectedChannels.has('instagram')) {
      platformOverrides.instagram = { postType: platformState.instagramPostType };
    }
    if (selectedChannels.has('youtube')) {
      platformOverrides.youtube = {
        title: platformState.youtubeTitle,
        postType: platformState.youtubeType,
      };
    }

    onSave({
      id: post?.id,
      content,
      status, 
      // When saving, new Date() automatically converts the local string BACK to UTC for the database!
      scheduledAt: status === 'SCHEDULED' ? new Date(scheduleDate).toISOString() : null,
      platforms: selectedChannelList,
      files,
      contentMetadata: { text: content, platformOverrides }
    });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose} style={{ zIndex: 1000, padding: '20px' }}>
      <div className={styles.publishPage} onClick={(e) => e.stopPropagation()} style={{ height: '90vh', background: '#f5f5f5', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', background: '#fff', borderBottom: '1px solid #eee' }}>
          <h2 style={{ margin: 0 }}>{post ? "Edit Scheduled Post" : "Schedule New Post"}</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input 
              type="datetime-local" 
              value={scheduleDate} 
              min={currentLocalTime} 
              onChange={(e) => setScheduleDate(e.target.value)} 
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} 
            />
            {post && <button onClick={() => onDelete(post.id)} style={{ color: 'red', padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer' }}>Delete</button>}
            <button onClick={onClose} style={{ padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
            <button onClick={() => handleSubmit('DRAFT')} style={{ padding: '8px 16px', background: '#eee', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>Save Draft</button>
            <button onClick={() => handleSubmit('SCHEDULED')} style={{ padding: '8px 16px', background: '#000', color: '#fff', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>Schedule Post</button>
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
            <ChannelSelector accounts={accounts} selectedChannels={selectedChannels} onSelectionChange={setSelectedChannels} />
            
            {/* Display the existing media if it exists! */}
            {post?.mediaUrl && files.length === 0 && (
              <div style={{ marginBottom: '15px', padding: '15px', background: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#666', fontWeight: 'bold' }}>Currently Attached Media:</p>
                <img src={post.mediaUrl} alt="Attached media" style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '6px', objectFit: 'contain' }} />
                <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#999' }}>*Uploading a new file below will replace this image.</p>
              </div>
            )}

            <ContentEditor content={content} onContentChange={setContent} files={files} onFilesChange={setFiles} effectiveRules={effectiveRules} validation={{}} />
            <PlatformFields selectedChannels={selectedChannels} platformState={platformState} setPlatformState={setPlatformState} facebookPages={facebookPages} />
          </div>
          <div style={{ width: '1px', background: '#ddd' }} />
          <div style={{ width: '400px', display: 'flex', flexDirection: 'column', background: '#fff' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
              <button style={{ flex: 1, padding: '15px', background: rightTab === 'ai' ? '#f9f9f9' : '#fff', border: 'none', cursor: 'pointer' }} onClick={() => setRightTab('ai')}>AI Assistant</button>
              <button style={{ flex: 1, padding: '15px', background: rightTab === 'preview' ? '#f9f9f9' : '#fff', border: 'none', cursor: 'pointer' }} onClick={() => setRightTab('preview')}>Preview</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {rightTab === 'ai' ? <AIAssistant /> : <div>Preview coming soon</div>}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

/* ─── Main Planning Component ────────────────────────────────── */
const Planning = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePlatform, setActivePlatform] = useState("all");
  const [view, setView] = useState("week");
  const [modal, setModal] = useState<any>(null);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);

  const { uploadMedia } = usePostCreation();

  const getWeekDates = () => {
    const now = new Date();
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
  
  const dateToGrid = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDay(); 
    let hourNum = date.getHours();
    const ampm = hourNum >= 12 ? "PM" : "AM";
    const displayHour = hourNum % 12 || 12;
    return { day, hour: `${displayHour} ${ampm}` };
  };

  const gridToDate = (dayIndex: number, hourStr: string, weekOffset: number) => {
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

  const fetchScheduledPosts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/posting/scheduled?offset=${currentWeekOffset}`);
      const formattedPosts = response.data.map((post: any) => ({
        ...post,
        platforms: post.platforms ? post.platforms.map((p: string) => p.toLowerCase()) : [],
        platform: post.platform.toLowerCase(),
        content: post.content || "",
        status: post.status.toLowerCase(),
        ...dateToGrid(post.scheduledAt)
      }));
      setPosts(formattedPosts);
    } catch (error) {
      console.error("Failed to fetch posts", error);
    } finally {
      setLoading(false);
    }
  }, [currentWeekOffset]);

  useEffect(() => {
    fetchScheduledPosts();
  }, [fetchScheduledPosts]);

  const handleSave = async (postData: any) => {
    try {
      let mediaUrl = undefined;
      let storagePath = undefined;
      let mimeType = undefined;
      let mediaType = undefined;

      if (postData.files && postData.files.length > 0) {
        const file = postData.files[0];
        mimeType = file.type;
        mediaType = file.type.startsWith('video') ? 'VIDEO' : 'IMAGE';

        const uploaded: any = await uploadMedia(file);
        
        if (uploaded) {
          mediaUrl = uploaded.publicUrl || uploaded.url; 
          storagePath = uploaded.storagePath || uploaded.key;
        }
      }

      const payload = {
        content: postData.content,
        platforms: postData.platforms,
        status: postData.status.toUpperCase(),
        scheduledAt: postData.scheduledAt,
        contentMetadata: postData.contentMetadata,
        ...(mediaUrl && { mediaUrl, storagePath, mimeType, mediaType })
      };

      if (postData.id) {
        await axios.patch(`/posting/${postData.id}`, payload);
      } else {
        await axios.post('/posting/create', payload);
      }
      
      setModal(null);
      fetchScheduledPosts();
    } catch (error) {
      console.error("Failed to save post", error);
      alert("Failed to save post");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/posting/${id}`);
      setModal(null);
      fetchScheduledPosts();
    } catch (error) {
      console.error("Failed to delete post", error);
    }
  };

  const handleDrop = async (e: any, day: number, hour: string) => {
    e.preventDefault();
    const id = parseInt(e.dataTransfer.getData("postId"), 10);
    
    const targetDateStr = gridToDate(day, hour, currentWeekOffset);
    if (new Date(targetDateStr) < new Date()) {
      alert("You cannot move a post into the past!");
      setDragOverCell(null);
      return;
    }
    
    const previousPosts = [...posts];
    setPosts((ps: any) => ps.map((p: any) => (p.id === id ? { ...p, day, hour } : p)));
    setDragOverCell(null);

    try {
      await axios.patch(`/posting/${id}/reschedule`, {
        scheduledAt: targetDateStr
      });
    } catch (error) {
      console.error("Failed to reschedule", error);
      setPosts(previousPosts); 
    }
  };

  const filtered = activePlatform === "all" ? posts : posts.filter((p: any) => p.platforms?.includes(activePlatform) || p.platform === activePlatform);
  
  const postsByCell = useMemo(() => {
    const map: Record<string, any[]> = {};
    filtered.forEach((post: any) => {
      const key = `${post.day}-${post.hour}`;
      if (!map[key]) map[key] = [];
      map[key].push(post);
    });
    return map;
  }, [filtered]);

  const stats = {
    total: posts.length,
    draft: posts.filter((p: any) => p.status === "draft").length,
    scheduled: posts.filter((p: any) => p.status === "scheduled").length,
    published: posts.filter((p: any) => p.status === "published").length,
  };

  const filterOptions = [
    { key: "all", label: "All Platforms", color: "#1a1a1a" },
    ...Object.entries(PLATFORMS).map(([k, v]) => ({ key: k, label: v.label, color: v.color })),
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Social Media Content Calendar</h1>
        <button className={styles.createBtn} onClick={() => setModal({ type: "create" })}>
          <span className={styles.createBtnPlus}>+</span> Create Post
        </button>
      </div>

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
                <span className={styles.platformDot} style={{ background: isActive ? "#fff" : p.color }} />
              )}
              {p.label}
            </button>
          );
        })}
      </div>

      <div className={styles.calendarCard}>
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
                    const cellPosts = postsByCell[cellKey] || [];
                    
                    return (
                      <td
                        key={di}
                        className={`${styles.calCell} ${dragOverCell === cellKey ? styles.dragOver : ""}`}
                        onDragOver={(e) => { e.preventDefault(); setDragOverCell(cellKey); }}
                        onDragLeave={() => setDragOverCell(null)}
                        onDrop={(e) => handleDrop(e, di, hour)}
                        onClick={() => {
                          const targetDate = new Date(weekDates[di]);
                          let hourNum = parseInt(hour.split(" ")[0]);
                          if (hour.includes("PM") && hourNum !== 12) hourNum += 12;
                          if (hour.includes("AM") && hourNum === 12) hourNum = 0;
                          targetDate.setHours(hourNum, 0, 0, 0);

                          if (targetDate < new Date()) {
                            alert("You cannot schedule a post in the past!");
                            return; 
                          }

                          // 🔥 FIX 1 APPLIED: Uses helper function when creating new post from grid click
                          const localTime = toLocalInput(targetDate.toISOString());
                          setModal({ type: 'create', initialDate: localTime });
                        }}
                      >
                        {cellPosts.map((post: any) => (
                          <PostCard key={post.id} post={post} onEdit={(p: any) => setModal({ type: "edit", post: p })} />
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

      {modal && (
        <AdvancedScheduleModal
          post={modal.type === "edit" ? modal.post : null}
          initialDate={modal.initialDate || (modal.type === "create" ? toLocalInput(new Date().toISOString()) : null)}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};

export default Planning;