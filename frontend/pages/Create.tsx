import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  CSSProperties,
} from "react";
import styles from "../styles/Create.module.css";
import {
  Type,
  Shapes,
  LayoutTemplate,
  Upload,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Plus,
  Trash2,
  Copy,
  MoveUp,
  MoveDown,
  Image as ImageIcon,
  Square,
  Circle,
  Triangle,
  Minus as Line,
  Star,
  Download,
  RotateCcw,
  RotateCw,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────

interface Platform {
  id: string;
  label: string;
  color: string;
  w: number;
  h: number;
  ratio: string;
}

interface BaseElement {
  id: string;
  x: number;
  y: number;
  width: number;
  zIndex: number;
}

interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  textDecoration: string;
  color: string;
  align: "left" | "center" | "right";
}

interface ImageElement extends BaseElement {
  type: "image";
  src: string;
  height: number;
}

interface ShapeElement extends BaseElement {
  type: "shape";
  shape: "rect" | "circle" | "triangle" | "line" | "star";
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

type CanvasElement = TextElement | ImageElement | ShapeElement;

interface DragState {
  id: string;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  canvasW: number;
  canvasH: number;
}

interface TextPreset {
  label: string;
  fontSize: number;
  fontWeight: string;
  text: string;
}

interface CreateProps {
  templateImage?: string;
  initialPlatformId?: string;
  onBack?: () => void;
}

// ── Constants ───────────────────────────────────────────────────────────────

const PLATFORMS: Platform[] = [
  { id: "instagram", label: "Instagram",  color: "#E1306C", w: 1080, h: 1080, ratio: "1:1"     },
  { id: "twitter",   label: "Twitter/X",  color: "#000000", w: 1200, h: 675,  ratio: "16:9"    },
  { id: "linkedin",  label: "LinkedIn",   color: "#0A66C2", w: 1200, h: 627,  ratio: "1.91:1"  },
  { id: "youtube",   label: "YouTube",    color: "#FF0000", w: 1280, h: 720,  ratio: "16:9"    },
  { id: "facebook",  label: "Facebook",   color: "#1877F2", w: 1200, h: 630,  ratio: "1.91:1"  },
  { id: "threads",   label: "Threads",    color: "#101010", w: 1080, h: 1080, ratio: "1:1"     },
];

const SHAPES = [
  { id: "rect"     as const, label: "Rectangle", Icon: Square   },
  { id: "circle"   as const, label: "Circle",    Icon: Circle   },
  { id: "triangle" as const, label: "Triangle",  Icon: Triangle },
  { id: "line"     as const, label: "Line",      Icon: Line     },
  { id: "star"     as const, label: "Star",      Icon: Star     },
];

const FRAMES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  src: `https://picsum.photos/seed/${200 + i}/160/120`,
}));

const GRAPHICS = [300,310,320,330,340,350,360,370,380,390,400,410].map((s, i) => ({
  id: i,
  src: `https://picsum.photos/seed/${s}/120/120`,
}));

const buildImages = (count: number, seedOffset: number, w: number, h: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: seedOffset + i,
    src: `https://picsum.photos/seed/${seedOffset + i}/${w}/${h}`,
  }));

const TEMPLATE_SECTIONS = [
  { name: "Instagram Posts",    seedOffset: 10,  w: 120, h: 120, count: 8 },
  { name: "YouTube Thumbnails", seedOffset: 50,  w: 160, h: 90,  count: 6 },
  { name: "LinkedIn Posts",     seedOffset: 100, w: 160, h: 84,  count: 6 },
];

const TEXT_PRESETS: TextPreset[] = [
  { label: "Add a heading",    fontSize: 48, fontWeight: "700", text: "Your Heading"                     },
  { label: "Add a subheading", fontSize: 28, fontWeight: "600", text: "Your Subheading"                  },
  { label: "Add body text",    fontSize: 16, fontWeight: "400", text: "Start typing your body text here" },
];

const CANVAS_DISPLAY_W = 680;

let _uid = 0;
const uid = () => `el_${++_uid}`;

// ── Component ───────────────────────────────────────────────────────────────

export default function Create({ templateImage, initialPlatformId, onBack }: CreateProps) {
  const [activePlatform, setActivePlatform] = useState<Platform>(
    PLATFORMS.find((p) => p.id === (initialPlatformId ?? "instagram")) ?? PLATFORMS[0]
  );
  const [sidebarTab, setSidebarTab] = useState<"text" | "elements" | "templates" | "uploads">("text");
  const [elements, setElements] = useState<CanvasElement[]>(() => {
    if (templateImage) {
      return [{
        id: uid(), type: "image", src: templateImage,
        x: 0, y: 0, width: 100, height: 100, zIndex: 1,
      }];
    }
    return [];
  });
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [history, setHistory]         = useState<CanvasElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [dragging, setDragging]       = useState<DragState | null>(null);
  const [textEditId, setTextEditId]   = useState<string | null>(null);

  const canvasRef   = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canvasH = Math.round((CANVAS_DISPLAY_W * activePlatform.h) / activePlatform.w);
  const selected = elements.find((e) => e.id === selectedId) ?? null;

  // ── History ───────────────────────────────────────────────────────────────

  const pushHistory = useCallback(
    (els: CanvasElement[]) => {
      setHistory((prev) => [...prev.slice(0, historyIndex + 1), JSON.parse(JSON.stringify(els))]);
      setHistoryIndex((i) => i + 1);
    },
    [historyIndex]
  );

  const undo = () => {
    if (historyIndex <= 0) return;
    const idx = historyIndex - 1;
    setElements(JSON.parse(JSON.stringify(history[idx])));
    setHistoryIndex(idx);
    setSelectedId(null);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const idx = historyIndex + 1;
    setElements(JSON.parse(JSON.stringify(history[idx])));
    setHistoryIndex(idx);
    setSelectedId(null);
  };

  // ── Element CRUD ──────────────────────────────────────────────────────────

  const addElement = (el: CanvasElement) => {
    const next = [...elements, el];
    setElements(next);
    setSelectedId(el.id);
    pushHistory(next);
  };

  const updateElement = (id: string, patch: Partial<CanvasElement>) => {
    const next = elements.map((e) => (e.id === id ? ({ ...e, ...patch } as CanvasElement) : e));
    setElements(next);
    pushHistory(next);
  };

  const deleteElement = (id: string) => {
    const next = elements.filter((e) => e.id !== id);
    setElements(next);
    setSelectedId(null);
    pushHistory(next);
  };

  const duplicateElement = (id: string) => {
    const el = elements.find((e) => e.id === id);
    if (!el) return;
    const copy: CanvasElement = { ...el, id: uid(), x: el.x + 2, y: el.y + 2, zIndex: el.zIndex + 1 };
    const next = [...elements, copy];
    setElements(next);
    setSelectedId(copy.id);
    pushHistory(next);
  };

  const bringForward = (id: string) => {
    const el = elements.find((e) => e.id === id);
    if (el) updateElement(id, { zIndex: el.zIndex + 1 });
  };

  const sendBackward = (id: string) => {
    const el = elements.find((e) => e.id === id);
    if (el) updateElement(id, { zIndex: Math.max(0, el.zIndex - 1) });
  };

  // ── Add helpers ───────────────────────────────────────────────────────────

  const addText = (preset: TextPreset) => {
    addElement({
      id: uid(), type: "text",
      text: preset.text, x: 10, y: 10, width: 80,
      fontSize: preset.fontSize, fontWeight: preset.fontWeight,
      color: "#111111", align: "left",
      fontStyle: "normal", textDecoration: "none",
      zIndex: elements.length + 1,
    });
  };

  const addShape = (shape: ShapeElement["shape"]) => {
    addElement({
      id: uid(), type: "shape", shape,
      x: 20, y: 20, width: 20, height: 20,
      fill: "#3b82f6", stroke: "none", strokeWidth: 2,
      zIndex: elements.length + 1,
    });
  };

  const addImage = (src: string) => {
    addElement({
      id: uid(), type: "image", src,
      x: 5, y: 5, width: 50, height: 40,
      zIndex: elements.length + 1,
    });
  };

  // ── Upload ────────────────────────────────────────────────────────────────

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { if (ev.target?.result) addImage(ev.target.result as string); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ── Drag ──────────────────────────────────────────────────────────────────

  const onMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedId(id);
    const rect = canvasRef.current!.getBoundingClientRect();
    const el = elements.find((el) => el.id === id)!;
    setDragging({
      id, startX: e.clientX, startY: e.clientY,
      origX: el.x, origY: el.y,
      canvasW: rect.width, canvasH: rect.height,
    });
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const dx = ((e.clientX - dragging.startX) / dragging.canvasW) * 100;
      const dy = ((e.clientY - dragging.startY) / dragging.canvasH) * 100;
      setElements((prev) =>
        prev.map((el) => el.id === dragging.id
          ? { ...el, x: dragging.origX + dx, y: dragging.origY + dy }
          : el
        )
      );
    };
    const onUp = () => { pushHistory(elements); setDragging(null); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging, elements, pushHistory]);

  // ── Shape SVG ─────────────────────────────────────────────────────────────

  const renderShapeSVG = (el: ShapeElement) => {
    const { shape, fill, stroke, strokeWidth } = el;
    const s = { fill, stroke: stroke === "none" ? "none" : stroke, strokeWidth };
    switch (shape) {
      case "rect":     return <rect x="5%" y="5%" width="90%" height="90%" {...s} />;
      case "circle":   return <ellipse cx="50%" cy="50%" rx="45%" ry="45%" {...s} />;
      case "triangle": return <polygon points="50,5 95,95 5,95" {...s} />;
      case "line":     return <line x1="5%" y1="50%" x2="95%" y2="50%" stroke={fill} strokeWidth={strokeWidth || 3} />;
      case "star": {
        const pts = Array.from({ length: 10 }, (_, i) => {
          const r = i % 2 === 0 ? 45 : 20;
          const angle = (Math.PI / 5) * i - Math.PI / 2;
          return `${50 + r * Math.cos(angle)},${50 + r * Math.sin(angle)}`;
        });
        return <polygon points={pts.join(" ")} {...s} />;
      }
    }
  };

  // ── Canvas element render ─────────────────────────────────────────────────

  const baseStyle = (el: CanvasElement): CSSProperties => ({
    position: "absolute" as const,
    left: `${el.x}%`,
    top: `${el.y}%`,
    zIndex: el.zIndex,
    cursor: "move",
    outline: selectedId === el.id ? "2px solid #3b82f6" : "none",
    outlineOffset: "2px",
  });

  const renderElement = (el: CanvasElement) => {
    if (el.type === "text") {
      const s: CSSProperties = {
        ...baseStyle(el),
        width: `${el.width}%`,
        minHeight: 20,
        color: el.color,
        fontSize: el.fontSize * (CANVAS_DISPLAY_W / activePlatform.w),
        fontWeight: el.fontWeight,
        fontStyle: el.fontStyle,
        textDecoration: el.textDecoration,
        textAlign: el.align,
        lineHeight: 1.3,
        wordBreak: "break-word",
        userSelect: textEditId === el.id ? "text" : "none",
      };
      return (
        <div
          key={el.id}
          style={s}
          onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, el.id); }}
          onDoubleClick={() => setTextEditId(el.id)}
          onBlur={() => setTextEditId(null)}
          contentEditable={textEditId === el.id}
          suppressContentEditableWarning
          onInput={(e) => {
            const text = e.currentTarget.textContent ?? "";
            updateElement(el.id, { text });
          }}
          onFocus={(e) => {
            if (textEditId === el.id) {
              const range = document.createRange();
              const sel = window.getSelection();
              range.selectNodeContents(e.currentTarget);
              range.collapse(false);
              sel?.removeAllRanges();
              sel?.addRange(range);
            }
          }}
        >
          {el.text}
        </div>
      );
    }

    if (el.type === "image") {
      return (
        <div
          key={el.id}
          style={{ ...baseStyle(el), width: `${el.width}%`, height: `${el.height}%` }}
          onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, el.id); }}
        >
          <img
            src={el.src} alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }}
          />
        </div>
      );
    }

    if (el.type === "shape") {
      return (
        <div
          key={el.id}
          style={{ ...baseStyle(el), width: `${el.width}%`, height: `${el.height}%` }}
          onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, el.id); }}
        >
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            {renderShapeSVG(el)}
          </svg>
        </div>
      );
    }
  };

  // ── Right sidebar ─────────────────────────────────────────────────────────

  const renderRightSidebar = () => {
    if (!selected) {
      return (
        <div className={styles.rightEmpty}>
          <ImageIcon size={28} strokeWidth={1.2} />
          <p>Select an element to edit its properties</p>
        </div>
      );
    }

    return (
      <div className={styles.rightPanel}>
        <div className={styles.rightSection}>
          <div className={styles.rightSectionTitle}>Position &amp; Size</div>
          <div className={styles.inputGrid}>
            <label>X<input type="number" value={Math.round(selected.x)} onChange={(e) => updateElement(selected.id, { x: +e.target.value })} /></label>
            <label>Y<input type="number" value={Math.round(selected.y)} onChange={(e) => updateElement(selected.id, { y: +e.target.value })} /></label>
            <label>W<input type="number" value={Math.round(selected.width)} onChange={(e) => updateElement(selected.id, { width: +e.target.value })} /></label>
            {selected.type !== "text" && (
              <label>H<input type="number" value={Math.round(selected.height)} onChange={(e) => updateElement(selected.id, { height: +e.target.value })} /></label>
            )}
          </div>
        </div>

        {selected.type === "text" && (
          <div className={styles.rightSection}>
            <div className={styles.rightSectionTitle}>Typography</div>
            <div className={styles.inputGrid}>
              <label>Size<input type="number" value={selected.fontSize} onChange={(e) => updateElement(selected.id, { fontSize: +e.target.value })} /></label>
              <label>Color<input type="color" value={selected.color} onChange={(e) => updateElement(selected.id, { color: e.target.value })} className={styles.colorInput} /></label>
            </div>
            <div className={styles.formatRow}>
              <button className={`${styles.fmtBtn} ${selected.fontWeight === "700" ? styles.fmtActive : ""}`} onClick={() => updateElement(selected.id, { fontWeight: selected.fontWeight === "700" ? "400" : "700" })}><Bold size={14} /></button>
              <button className={`${styles.fmtBtn} ${selected.fontStyle === "italic" ? styles.fmtActive : ""}`} onClick={() => updateElement(selected.id, { fontStyle: selected.fontStyle === "italic" ? "normal" : "italic" })}><Italic size={14} /></button>
              <button className={`${styles.fmtBtn} ${selected.textDecoration === "underline" ? styles.fmtActive : ""}`} onClick={() => updateElement(selected.id, { textDecoration: selected.textDecoration === "underline" ? "none" : "underline" })}><Underline size={14} /></button>
              <div className={styles.divider} />
              <button className={`${styles.fmtBtn} ${selected.align === "left"   ? styles.fmtActive : ""}`} onClick={() => updateElement(selected.id, { align: "left" })}><AlignLeft size={14} /></button>
              <button className={`${styles.fmtBtn} ${selected.align === "center" ? styles.fmtActive : ""}`} onClick={() => updateElement(selected.id, { align: "center" })}><AlignCenter size={14} /></button>
              <button className={`${styles.fmtBtn} ${selected.align === "right"  ? styles.fmtActive : ""}`} onClick={() => updateElement(selected.id, { align: "right" })}><AlignRight size={14} /></button>
            </div>
          </div>
        )}

        {selected.type === "shape" && (
          <div className={styles.rightSection}>
            <div className={styles.rightSectionTitle}>Appearance</div>
            <div className={styles.inputGrid}>
              <label>Fill<input type="color" value={selected.fill} onChange={(e) => updateElement(selected.id, { fill: e.target.value })} className={styles.colorInput} /></label>
              <label>Stroke<input type="color" value={selected.stroke === "none" ? "#000000" : selected.stroke} onChange={(e) => updateElement(selected.id, { stroke: e.target.value })} className={styles.colorInput} /></label>
              <label>Stroke W<input type="number" min="0" max="20" value={selected.strokeWidth} onChange={(e) => updateElement(selected.id, { strokeWidth: +e.target.value })} /></label>
            </div>
          </div>
        )}

        <div className={styles.rightSection}>
          <div className={styles.rightSectionTitle}>Layer</div>
          <div className={styles.layerRow}>
            <button className={styles.layerBtn} onClick={() => bringForward(selected.id)}><MoveUp size={14} /> Forward</button>
            <button className={styles.layerBtn} onClick={() => sendBackward(selected.id)}><MoveDown size={14} /> Backward</button>
            <button className={styles.layerBtn} onClick={() => duplicateElement(selected.id)}><Copy size={14} /> Duplicate</button>
            <button className={`${styles.layerBtn} ${styles.deleteBtn}`} onClick={() => deleteElement(selected.id)}><Trash2 size={14} /> Delete</button>
          </div>
        </div>
      </div>
    );
  };

  // ── Sidebar content ───────────────────────────────────────────────────────

  const renderSidebarContent = () => {
    if (sidebarTab === "text") return (
      <div className={styles.sideContent}>
        <div className={styles.sideSection}>
          <button className={styles.addTextBtn} onClick={() => addText(TEXT_PRESETS[2])}>
            <Plus size={14} /> Add a text box
          </button>
        </div>
        <div className={styles.sideSection}>
          <div className={styles.sideSectionLabel}>Default text styles</div>
          {TEXT_PRESETS.map((p) => (
            <button key={p.label} className={styles.textPreset} onClick={() => addText(p)}>
              <span style={{ fontSize: Math.min(p.fontSize * 0.28, 20), fontWeight: p.fontWeight }}>
                {p.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    );

    if (sidebarTab === "elements") return (
      <div className={styles.sideContent}>
        <div className={styles.sideSection}>
          <div className={styles.sideSectionLabel}>Shapes</div>
          <div className={styles.shapeGrid}>
            {SHAPES.map(({ id, label, Icon }) => (
              <button key={id} className={styles.shapeBtn} onClick={() => addShape(id)} title={label}>
                <Icon size={22} strokeWidth={1.5} /><span>{label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className={styles.sideSection}>
          <div className={styles.sideSectionLabel}>Frames</div>
          <div className={styles.thumbGrid}>
            {FRAMES.map((f) => (
              <button key={f.id} className={styles.thumbBtn} onClick={() => addImage(f.src)}>
                <img src={f.src} alt="frame" />
              </button>
            ))}
          </div>
        </div>
        <div className={styles.sideSection}>
          <div className={styles.sideSectionLabel}>Graphics</div>
          <div className={styles.thumbGrid}>
            {GRAPHICS.map((g) => (
              <button key={g.id} className={styles.thumbBtn} onClick={() => addImage(g.src)}>
                <img src={g.src} alt="graphic" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );

    if (sidebarTab === "templates") return (
      <div className={styles.sideContent}>
        {TEMPLATE_SECTIONS.map((sec) => (
          <div key={sec.name} className={styles.sideSection}>
            <div className={styles.sideSectionLabel}>{sec.name}</div>
            <div className={styles.thumbGrid}>
              {buildImages(sec.count, sec.seedOffset, sec.w, sec.h).map((img) => (
                <button key={img.id} className={styles.thumbBtn} onClick={() => addImage(img.src)}>
                  <img src={img.src} alt="template" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );

    if (sidebarTab === "uploads") return (
      <div className={styles.sideContent}>
        <div className={styles.sideSection}>
          <button className={styles.uploadBtn} onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} /> Upload image
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleUpload} />
          <p className={styles.uploadHint}>Supports JPG, PNG, SVG, WEBP</p>
        </div>
      </div>
    );

    return null;
  };

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <div className={styles.topLeft}>
          <span className={styles.topTitle}>Create Post</span>
        </div>

        <div className={styles.platforms}>
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              className={`${styles.platformBtn} ${activePlatform.id === p.id ? styles.platformActive : ""}`}
              onClick={() => setActivePlatform(p)}
            >
              <span className={styles.platformDot} style={{ background: p.color }} />
              {p.label}
            </button>
          ))}
        </div>

        <div className={styles.topRight}>
          <button className={styles.iconBtn} onClick={undo} title="Undo"><RotateCcw size={16} /></button>
          <button className={styles.iconBtn} onClick={redo} title="Redo"><RotateCw size={16} /></button>
          <button className={styles.downloadBtn}><Download size={14} /> Download</button>
        </div>
      </header>

      <div className={styles.workspace}>
        <aside className={styles.tabBar}>
          {(["text", "elements", "templates", "uploads"] as const).map((tab) => {
            const Icon = { text: Type, elements: Shapes, templates: LayoutTemplate, uploads: Upload }[tab];
            const label = tab.charAt(0).toUpperCase() + tab.slice(1);
            return (
              <button
                key={tab}
                className={`${styles.tabBtn} ${sidebarTab === tab ? styles.tabActive : ""}`}
                onClick={() => setSidebarTab(tab)}
              >
                <Icon size={20} strokeWidth={1.5} />
                <span>{label}</span>
              </button>
            );
          })}
        </aside>

        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>
              {sidebarTab.charAt(0).toUpperCase() + sidebarTab.slice(1)}
            </span>
          </div>
          {renderSidebarContent()}
        </aside>

        <main className={styles.canvasArea} onClick={() => setSelectedId(null)}>
          <div className={styles.canvasMeta}>
            {activePlatform.label} · {activePlatform.ratio} · {activePlatform.w}×{activePlatform.h}px
          </div>
          <div
            ref={canvasRef}
            className={styles.canvas}
            style={{ width: CANVAS_DISPLAY_W, height: canvasH }}
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}
          >
            {[...elements].sort((a, b) => a.zIndex - b.zIndex).map(renderElement)}
            {elements.length === 0 && (
              <div className={styles.canvasEmpty}>
                <ImageIcon size={32} strokeWidth={1} />
                <p>Add text, shapes or templates<br />from the left panel</p>
              </div>
            )}
          </div>
        </main>

        <div className={styles.divider}></div>

        <aside className={styles.rightSidebar}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>Properties</span>
          </div>
          {renderRightSidebar()}
        </aside>
      </div>
    </div>
  );
}