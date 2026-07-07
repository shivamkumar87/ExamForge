import { useRef, useState, useEffect } from "react";

export default function Whiteboard({ side = "right", onClose, onSideChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#1e3a8a");
  const [size, setSize] = useState(3);
//   const [side, setSide] = useState("right");

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const handleSideToggle = () => {
    const newSide = side === "right" ? "left" : "right";
    // setSide(newSide);
    onSideChange?.(newSide);
  };

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    drawing.current = true;
    const canvas = canvasRef.current;
    const pos = getPos(e, canvas);
    lastPos.current = pos;
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.arc(
      pos.x,
      pos.y,
      (tool === "eraser" ? size * 4 : size) / 2,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.fill();
  };

  const draw = (e) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = tool === "eraser" ? size * 4 : size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    lastPos.current = pos;
  };

  const stopDraw = () => {
    drawing.current = false;
  };

  const clearAll = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const colors = [
    "#1e3a8a",
    "#dc2626",
    "#16a34a",
    "#d97706",
    "#7c3aed",
    "#000000",
  ];

  return (
    <div
      className={`fixed ${side === "right" ? "right-0" : "left-0"} bg-white shadow-xl z-30 flex flex-col transition-all duration-300`}
      style={{
        top: "88px",
        bottom: "6px",
        width: "50%",
        borderLeft: side === "right" ? "1px solid #e5e7eb" : "none",
        borderRight: side === "left" ? "1px solid #e5e7eb" : "none",
      }}
    >
      {/* Toolbar row 1 */}
      <div className="bg-white border-b border-gray-200 px-3 py-2 flex items-center gap-2">
        <button
          onClick={() => setTool("pen")}
          className={`text-xs px-2 py-1 rounded-lg font-semibold ${tool === "pen" ? "bg-blue-700 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
        >
          ✏️ Pen
        </button>
        <button
          onClick={() => setTool("eraser")}
          className={`text-xs px-2 py-1 rounded-lg font-semibold ${tool === "eraser" ? "bg-blue-700 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
        >
          🧹 Eraser
        </button>
        <button
          onClick={clearAll}
          className="text-xs border border-red-200 text-red-500 px-2 py-1 rounded-lg hover:bg-red-50"
        >
          🗑 Clear
        </button>
        <button
          onClick={handleSideToggle}
          className="text-xs border border-gray-200 px-2 py-1 rounded-lg text-gray-600 hover:bg-gray-50 ml-auto"
          title="Switch side"
        >
          {side === "right" ? "◀ Left" : "Right ▶"}
        </button>
        <button
          onClick={onClose}
          className="text-xs border border-gray-200 text-gray-500 px-2 py-1 rounded-lg hover:bg-gray-50"
        >
          ✕
        </button>
      </div>

      {/* Size */}
      <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-3">
        <span className="text-xs text-gray-500">Size:</span>
        <input
          type="range"
          min="1"
          max="20"
          value={size}
          onChange={(e) => setSize(parseInt(e.target.value))}
          className="flex-1"
        />
        <span className="text-xs text-gray-500 w-4">{size}</span>
      </div>

      {/* Colors */}
      <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500">Color:</span>
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => {
              setColor(c);
              setTool("pen");
            }}
            className={`w-5 h-5 rounded-full border-2 transition-transform ${color === c && tool === "pen" ? "border-blue-500 scale-125" : "border-transparent"}`}
            style={{ backgroundColor: c }}
          />
        ))}
        <input
          type="color"
          value={color}
          onChange={(e) => {
            setColor(e.target.value);
            setTool("pen");
          }}
          className="w-5 h-5 rounded cursor-pointer border-0"
          title="Custom color"
        />
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="flex-1 w-full cursor-crosshair touch-none bg-white"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />
    </div>
  );
}
