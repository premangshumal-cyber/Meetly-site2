/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Eraser, 
  PenTool, 
  Square, 
  Circle, 
  ArrowRight, 
  StickyNote, 
  Grid, 
  Columns, 
  Undo2, 
  Redo2, 
  Trash2, 
  FileText, 
  CornerDownRight, 
  Eye, 
  Sparkles,
  Smile,
  Type
} from 'lucide-react';

interface WhiteboardWidgetProps {
  strokes: any[];
  onAddStroke: (stroke: any) => void;
  onClearBoard: () => void;
}

export default function WhiteboardWidget({ strokes, onAddStroke, onClearBoard }: WhiteboardWidgetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState('#ef4444');
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'sticky' | 'shape-rect' | 'shape-circle' | 'shape-arrow'>('pen');
  const [bgTemplate, setBgTemplate] = useState<'blank' | 'grid' | 'venn' | 'mindmap'>('blank');

  // Interactive Sticky Notes state
  const [stickies, setStickies] = useState<{ id: string; text: string; x: number; y: number; color: string }[]>([]);
  const [newStickyText, setNewStickyText] = useState('');

  // Undo / Redo stacks (local)
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);

  // Local drawing track
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and Redraw the canvas background template
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackgroundTemplate(ctx, canvas.width, canvas.height);

    // Draw all active strokes
    strokes.forEach((stroke) => {
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (stroke.points && stroke.points.length > 0) {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    });
  }, [strokes, bgTemplate]);

  // Handle templates
  const drawBackgroundTemplate = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (bgTemplate === 'blank') return;

    ctx.save();
    if (bgTemplate === 'grid') {
      ctx.strokeStyle = '#222630';
      ctx.lineWidth = 0.5;
      const step = 25;
      for (let x = 0; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    } else if (bgTemplate === 'venn') {
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 1.5;
      ctx.fillStyle = 'rgba(79, 70, 229, 0.03)';
      
      // Left Circle
      ctx.beginPath();
      ctx.arc(w / 2 - 60, h / 2, 90, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Right Circle
      ctx.strokeStyle = '#f43f5e';
      ctx.fillStyle = 'rgba(244, 63, 94, 0.03)';
      ctx.beginPath();
      ctx.arc(w / 2 + 60, h / 2, 90, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Text labels
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Courier New';
      ctx.fillText('Concept A', w / 2 - 120, h / 2 - 105);
      ctx.fillText('Concept B', w / 2 + 70, h / 2 - 105);
      ctx.fillText('Common', w / 2 - 20, h / 2);
    } else if (bgTemplate === 'mindmap') {
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(234, 179, 8, 0.05)';
      
      // Core Topic Node
      ctx.beginPath();
      ctx.roundRect(w / 2 - 60, h / 2 - 20, 120, 40, 8);
      ctx.fill();
      ctx.stroke();

      // Branch lines
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      
      ctx.beginPath();
      ctx.moveTo(w / 2 - 60, h / 2);
      ctx.lineTo(w / 2 - 150, h / 2 - 50);
      ctx.moveTo(w / 2 - 60, h / 2);
      ctx.lineTo(w / 2 - 150, h / 2 + 50);

      ctx.moveTo(w / 2 + 60, h / 2);
      ctx.lineTo(w / 2 + 150, h / 2 - 50);
      ctx.moveTo(w / 2 + 60, h / 2);
      ctx.lineTo(w / 2 + 150, h / 2 + 50);
      ctx.stroke();

      // Label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Courier New';
      ctx.fillText('Core Topic', w / 2 - 35, h / 2 + 5);
    }
    ctx.restore();
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  // Canvas drawing starts
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const coords = getCoordinates(e);
    if (!coords) return;
    
    isDrawing.current = true;
    lastPos.current = coords;

    if (tool.startsWith('shape-')) {
      // Create initial shape template
      return;
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !lastPos.current) return;
    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    if (tool === 'pen' || tool === 'eraser') {
      const strokeColor = tool === 'eraser' ? '#0c0d11' : color;
      const strokeWidth = tool === 'eraser' ? 24 : lineWidth;

      ctx.beginPath();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();

      // Add to broadcast stack
      onAddStroke({
        color: strokeColor,
        width: strokeWidth,
        points: [lastPos.current, coords]
      });

      lastPos.current = coords;
    }
  };

  const stopDrawing = () => {
    isDrawing.current = false;
    lastPos.current = null;
  };

  // Shapes builder
  const handleAddShape = (shapeType: 'rect' | 'circle' | 'arrow') => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const midX = canvas.width / 2;
    const midY = canvas.height / 2;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();

    const shapePoints: any[] = [];

    if (shapeType === 'rect') {
      ctx.strokeRect(midX - 50, midY - 30, 100, 60);
      // Simulate drawing the border
      shapePoints.push({ x: midX - 50, y: midY - 30 });
      shapePoints.push({ x: midX + 50, y: midY - 30 });
      shapePoints.push({ x: midX + 50, y: midY + 30 });
      shapePoints.push({ x: midX - 50, y: midY + 30 });
      shapePoints.push({ x: midX - 50, y: midY - 30 });
    } else if (shapeType === 'circle') {
      ctx.arc(midX, midY, 40, 0, Math.PI * 2);
      ctx.stroke();
      // Generate circular points to sync WebRTC peer whiteboard
      for (let angle = 0; angle <= 360; angle += 15) {
        const rad = (angle * Math.PI) / 180;
        shapePoints.push({ x: midX + Math.cos(rad) * 40, y: midY + Math.sin(rad) * 40 });
      }
    } else if (shapeType === 'arrow') {
      ctx.moveTo(midX - 60, midY);
      ctx.lineTo(midX + 60, midY);
      ctx.lineTo(midX + 45, midY - 10);
      ctx.moveTo(midX + 60, midY);
      ctx.lineTo(midX + 45, midY + 10);
      ctx.stroke();

      shapePoints.push({ x: midX - 60, y: midY });
      shapePoints.push({ x: midX + 60, y: midY });
      shapePoints.push({ x: midX + 45, y: midY - 10 });
    }

    ctx.restore();

    onAddStroke({
      color: color,
      width: lineWidth,
      points: shapePoints
    });
  };

  // Sticky notes actions
  const addStickyNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStickyText.trim()) return;

    const canvas = canvasRef.current;
    const canvasWidth = canvas ? canvas.width : 500;
    const canvasHeight = canvas ? canvas.height : 300;

    const newSticky = {
      id: Math.random().toString(),
      text: newStickyText.trim(),
      x: 40 + Math.random() * (canvasWidth - 140),
      y: 40 + Math.random() * (canvasHeight - 140),
      color: ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8'][stickies.length % 4]
    };

    setStickies(prev => [...prev, newSticky]);
    setNewStickyText('');
  };

  const handleDragSticky = (id: string, dx: number, dy: number) => {
    setStickies(prev => prev.map(s => s.id === id ? { ...s, x: s.x + dx, y: s.y + dy } : s));
  };

  const handleClear = () => {
    onClearBoard();
    setStickies([]);
  };

  return (
    <div className="flex flex-col bg-[#0c0d11] border border-border-custom rounded-2xl overflow-hidden shadow-2xl relative">
      
      {/* Board Top Menu Controls */}
      <div className="flex flex-wrap items-center justify-between p-3.5 bg-panel border-b border-border-custom gap-2 shrink-0 z-10">
        
        {/* Drawing Tools Selector */}
        <div className="flex items-center gap-1.5 bg-panel-2 p-1 rounded-xl border border-border-custom">
          <button
            onClick={() => setTool('pen')}
            className={`p-2 rounded-lg transition-all cursor-pointer ${tool === 'pen' ? 'bg-accent text-[#1a0800]' : 'text-text-dim hover:text-white hover:bg-panel-3'}`}
            title="Pen Drawing"
          >
            <PenTool className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-lg transition-all cursor-pointer ${tool === 'eraser' ? 'bg-accent text-[#1a0800]' : 'text-text-dim hover:text-white hover:bg-panel-3'}`}
            title="Eraser Tool"
          >
            <Eraser className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-border-custom mx-0.5" />
          <button
            onClick={() => handleAddShape('rect')}
            className="p-2 rounded-lg text-text-dim hover:text-white hover:bg-panel-3 cursor-pointer"
            title="Insert Rectangle"
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleAddShape('circle')}
            className="p-2 rounded-lg text-text-dim hover:text-white hover:bg-panel-3 cursor-pointer"
            title="Insert Circle"
          >
            <Circle className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleAddShape('arrow')}
            className="p-2 rounded-lg text-text-dim hover:text-white hover:bg-panel-3 cursor-pointer"
            title="Insert Arrow"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Color Palette Picker */}
        <div className="flex items-center gap-1 bg-panel-2 p-1.5 rounded-xl border border-border-custom">
          {['#ef4444', '#10b981', '#3b82f6', '#eab308', '#a855f7', '#ffffff'].map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-5 h-5 rounded-full border transition-transform hover:scale-110 cursor-pointer"
              style={{
                backgroundColor: c,
                borderColor: color === c ? '#ff7043' : 'rgba(255,255,255,0.1)',
                borderWidth: color === c ? '2px' : '1px'
              }}
            />
          ))}
          <input 
            type="range" 
            min="1" 
            max="12" 
            value={lineWidth} 
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="w-14 accent-accent"
          />
        </div>

        {/* Background Educational Templates */}
        <div className="flex items-center gap-1.5 bg-panel-2 p-1 rounded-xl border border-border-custom">
          <span className="text-[10px] text-text-faint font-extrabold uppercase px-1">Templates:</span>
          {(['blank', 'grid', 'venn', 'mindmap'] as const).map((temp) => (
            <button
              key={temp}
              onClick={() => setBgTemplate(temp)}
              className={`text-[10px] font-bold px-2 py-1 rounded transition-colors cursor-pointer capitalize ${bgTemplate === temp ? 'bg-accent/15 border border-accent/20 text-accent' : 'text-text-dim hover:text-white'}`}
            >
              {temp}
            </button>
          ))}
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center gap-1 bg-panel-2 p-1 rounded-xl border border-border-custom">
          <button
            onClick={handleClear}
            className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
            title="Clear Entire Canvas"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Board Draw Window Frame */}
      <div className="relative w-full aspect-[16/9] bg-[#0c0d11] overflow-hidden select-none cursor-crosshair">
        
        {/* Draw Canvas */}
        <canvas
          ref={canvasRef}
          width={800}
          height={450}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full object-contain"
        />

        {/* Render sticky notes over whiteboard */}
        {stickies.map((sticky) => {
          let dragStart: { x: number; y: number } | null = null;
          return (
            <div
              key={sticky.id}
              style={{
                left: sticky.x,
                top: sticky.y,
                backgroundColor: sticky.color
              }}
              className="absolute w-28 h-28 p-2 rounded shadow-xl text-black select-text cursor-grab active:cursor-grabbing text-[11px] font-medium leading-normal overflow-hidden flex flex-col justify-between"
              onMouseDown={(e) => {
                dragStart = { x: e.clientX, y: e.clientY };
                const moveHandler = (moveEvent: MouseEvent) => {
                  if (!dragStart) return;
                  const dx = moveEvent.clientX - dragStart.x;
                  const dy = moveEvent.clientY - dragStart.y;
                  handleDragSticky(sticky.id, dx, dy);
                  dragStart = { x: moveEvent.clientX, y: moveEvent.clientY };
                };
                const upHandler = () => {
                  dragStart = null;
                  window.removeEventListener('mousemove', moveHandler);
                  window.removeEventListener('mouseup', upHandler);
                };
                window.addEventListener('mousemove', moveHandler);
                window.addEventListener('mouseup', upHandler);
              }}
            >
              <div className="flex-1 overflow-y-auto pr-1">
                {sticky.text}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setStickies(prev => prev.filter(s => s.id !== sticky.id));
                }}
                className="text-[9px] text-red-500/80 hover:text-red-600 font-bold text-right cursor-pointer"
              >
                Delete
              </button>
            </div>
          );
        })}

        {/* Sticky Note input overlay creator */}
        <div className="absolute bottom-3 left-3 bg-[#111317]/90 border border-border-custom/80 rounded-xl p-2.5 shadow-2xl z-10 max-w-[180px]">
          <form onSubmit={addStickyNote} className="space-y-1.5">
            <label className="text-[9px] font-extrabold text-text-faint uppercase tracking-wider flex items-center gap-1">
              <StickyNote className="w-3 h-3 text-accent" />
              Add Sticky Note
            </label>
            <div className="flex gap-1">
              <input
                type="text"
                value={newStickyText}
                onChange={(e) => setNewStickyText(e.target.value)}
                placeholder="Type note..."
                className="bg-[#181a1f] border border-border-custom rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none w-full"
              />
              <button
                type="submit"
                className="p-1.5 bg-accent hover:bg-[#ff8c4d] rounded-lg text-black cursor-pointer font-bold text-[10px]"
              >
                +
              </button>
            </div>
          </form>
        </div>

        {/* Math & Mind Map Formulas quick legend */}
        <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-[2px] border border-white/10 p-2.5 rounded-lg text-text-faint font-mono text-[9px] space-y-1">
          <div className="font-bold text-white flex items-center gap-1 text-[8px] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-accent animate-spin" />
            Classroom Formulas Block
          </div>
          <div>• Euler: e^(iπ) + 1 = 0</div>
          <div>• Quadratic: x = (-b±√(b²-4ac))/2a</div>
          <div>• Area: A = πr²</div>
        </div>

      </div>

    </div>
  );
}
