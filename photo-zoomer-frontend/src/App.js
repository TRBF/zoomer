
import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';

function App() {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [squareStart, setSquareStart] = useState(null);
  const [squareEnd, setSquareEnd] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [lastIntegerZoom, setLastIntegerZoom] = useState(1);
  
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  // Sample image URL - replace with your actual image
  const imageUrl = 'https://picsum.photos/2000/2000';

  // Set CSS custom property for background image
  useEffect(() => {
    document.documentElement.style.setProperty('--background-image-url', `url('${imageUrl}')`);
  }, [imageUrl]);

  // Handle zoom level changes and detect integer steps
  useEffect(() => {
    const currentIntegerZoom = Math.floor(zoomLevel);
    if (currentIntegerZoom !== lastIntegerZoom) {
      console.log(`🔄 Zoom level changed to integer step: ${currentIntegerZoom}`);
      console.log(`📡 Would send GET request to backend for zoom level: ${currentIntegerZoom}`);
      setLastIntegerZoom(currentIntegerZoom);
    }
  }, [zoomLevel, lastIntegerZoom]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e) => {
      const step = 0.1;
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setPosition(prev => ({ ...prev, y: prev.y - 10 }));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setPosition(prev => ({ ...prev, y: prev.y + 10 }));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setPosition(prev => ({ ...prev, x: prev.x - 10 }));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setPosition(prev => ({ ...prev, x: prev.x + 10 }));
          break;
        case '+':
        case '=':
          e.preventDefault();
          setZoomLevel(prev => Math.min(prev + step, 10));
          break;
        case '-':
          e.preventDefault();
          setZoomLevel(prev => Math.max(prev - step, 0.1));
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomLevel(prev => Math.max(0.1, Math.min(10, prev + delta)));
  }, []);

  // Mouse drag for panning
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (e.button === 0 && !e.ctrlKey) { // Left click without Control key
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // square drawing functionality
  const handleCanvasMouseDown = (e) => {
    if (e.button === 0 && e.ctrlKey) { // left click + control key
      const rect = canvasRef.current.getBoundingClientRect();
      const canvas = canvasRef.current;
      
      // Get mouse position relative to the scaled canvas
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      
      // Convert from screen coordinates to canvas coordinates
      // The canvas has fixed dimensions but is scaled by CSS, so we need to account for that
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      const x = rawX * scaleX;
      const y = rawY * scaleY;

      setIsDrawing(true);
      setSquareStart({ x, y });
      setSquareEnd({ x, y });
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (isDrawing) {
      const rect = canvasRef.current.getBoundingClientRect();
      const canvas = canvasRef.current;
      
      // Get mouse position relative to the scaled canvas
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      
      // Convert from screen coordinates to canvas coordinates
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      const x = rawX * scaleX;
      const y = rawY * scaleY;
      
      setSquareEnd({ x, y });
    }
  };

  const handleCanvasMouseUp = () => {
    if (isDrawing && squareStart && squareEnd) {
      console.log(`📦 Square drawn from (${squareStart.x}, ${squareStart.y}) to (${squareEnd.x}, ${squareEnd.y})`);
      console.log(`📡 Would send GET request to backend with coordinates: ${JSON.stringify({
        start: squareStart,
        end: squareEnd
      })}`);
    }
    setIsDrawing(false);
    setSquareStart(null);
    setSquareEnd(null);
  };

  // Chat functionality
  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (chatMessage.trim()) {
      console.log(`💬 Chat message: "${chatMessage}"`);
      console.log(`📡 Would send GET request to backend with query: "${chatMessage}"`);
      setChatMessage('');
    }
  };

  // Draw square on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (squareStart && squareEnd) {
      // Draw directly in canvas coordinates
      // The canvas is already being scaled by CSS, so no need to apply zoom/position here
      const rectX = Math.min(squareStart.x, squareEnd.x);
      const rectY = Math.min(squareStart.y, squareEnd.y);
      const rectWidth = Math.abs(squareEnd.x - squareStart.x);
      const rectHeight = Math.abs(squareEnd.y - squareStart.y);
      
      // Fill with white at 10% opacity
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
      
      // Red outline
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
    }
  }, [squareStart, squareEnd]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🌌 Intergalactic Zoomer</h1>
        <div className="controls-info">
          <p>Use arrow keys or mouse to move • Mouse wheel to zoom • Ctrl + drag to draw squares</p>
        </div>
      </header>

      <main className="main-content">
        <div className="image-container">
          <div
            className="image-wrapper"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoomLevel})`,
              cursor: isDragging ? 'grabbing' : 'grab'
            }}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Zoomable image"
              className="main-image"
              draggable={false}
            />
            <canvas
              ref={canvasRef}
              className="drawing-canvas"
              width={2000}
              height={2000}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
            />
          </div>
        </div>

        <div className="sidebar">
          <div className="zoom-info">
            <h3>Zoom Level</h3>
            <p>{zoomLevel.toFixed(2)}x</p>
            <div className="zoom-controls">
              <button onClick={() => setZoomLevel(prev => Math.max(0.1, prev - 0.1))}>
                -
              </button>
              <button onClick={() => setZoomLevel(prev => Math.min(10, prev + 0.1))}>
                +
              </button>
            </div>
          </div>

          <div className="position-info">
            <h3>Position</h3>
            <p>X: {position.x.toFixed(0)}px</p>
            <p>Y: {position.y.toFixed(0)}px</p>
          </div>

          <div className="chat-section">
            <h3>Chat</h3>
            <form onSubmit={handleChatSubmit}>
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Enter your query..."
                className="chat-input"
              />
              <button type="submit" className="chat-submit">
                Send
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
