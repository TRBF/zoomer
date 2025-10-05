
import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';

const BACKEND_URL = 'http://localhost:8000';

// Image dimensions from the NASA FITS file
const IMAGE_WIDTH = 12200;  // Original image width
const IMAGE_HEIGHT = 8600;   // Original image height
const VIEWPORT_WIDTH = 1920;  // Display resolution
const VIEWPORT_HEIGHT = 1080; // Display resolution

function App() {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [imageCoords, setImageCoords] = useState({ x: 0, y: 0 }); // Actual image coordinates
  const [isDrawing, setIsDrawing] = useState(false);
  const [squareStart, setSquareStart] = useState(null);
  const [squareEnd, setSquareEnd] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [lastIntegerZoom, setLastIntegerZoom] = useState(1);
  const [currentImage, setCurrentImage] = useState(null);
  const [nextImage, setNextImage] = useState(null);
  const [imageCache, setImageCache] = useState({});
  
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  // Convert screen position to image coordinates
  const getImageCoordinates = useCallback((screenPos, zoom) => {
    // Calculate the center of the viewport in screen space
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;
    
    // Calculate what point in the image is at the viewport center
    // Starting from image center, adjusted by the pan position
    const imageCenterX = IMAGE_WIDTH / 2;
    const imageCenterY = IMAGE_HEIGHT / 2;
    
    // The offset from center due to panning (inverted because positive pan moves image right/down)
    const offsetX = -screenPos.x / zoom;
    const offsetY = -screenPos.y / zoom;
    
    // The actual image coordinates at the viewport center
    const imageX = Math.max(0, Math.min(IMAGE_WIDTH, imageCenterX + offsetX));
    const imageY = Math.max(0, Math.min(IMAGE_HEIGHT, imageCenterY + offsetY));
    
    return { x: Math.round(imageX), y: Math.round(imageY) };
  }, []);

  // Update image coordinates when position or zoom changes
  useEffect(() => {
    const coords = getImageCoordinates(position, zoomLevel);
    setImageCoords(coords);
  }, [position, zoomLevel, getImageCoordinates]);

  // Fetch image from backend for a specific zoom level
  const fetchImage = useCallback(async (zoom, x = 0, y = 0) => {
    const cacheKey = `${zoom}_${x}_${y}`;
    
    // Check cache first
    if (imageCache[cacheKey]) {
      return imageCache[cacheKey];
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/image?zoom=${zoom}&x=${x}&y=${y}`);
      if (response.ok) {
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        
        // Update cache
        setImageCache(prev => ({ ...prev, [cacheKey]: imageUrl }));
        
        return imageUrl;
      } else {
        console.error(`Failed to fetch image for zoom=${zoom}, x=${x}, y=${y}`);
        return null;
      }
    } catch (error) {
      console.error('Error fetching image:', error);
      return null;
    }
  }, [imageCache]);

  // Handle zoom level changes and detect integer steps
  useEffect(() => {
    const currentIntegerZoom = Math.floor(zoomLevel);
    const nextIntegerZoom = Math.ceil(zoomLevel);
    
    // Fetch new images when zoom level changes
    if (currentIntegerZoom !== lastIntegerZoom) {
      console.log(`🔄 Zoom level: ${currentIntegerZoom}, Position: (${imageCoords.x}, ${imageCoords.y})`);
      setLastIntegerZoom(currentIntegerZoom);
      
      // Fetch the current zoom level image with correct coordinates
      fetchImage(currentIntegerZoom, imageCoords.x, imageCoords.y).then(url => {
        if (url) {
          setCurrentImage(url);
        }
      });
      
      // Pre-fetch the next zoom level for smooth transition
      if (nextIntegerZoom > currentIntegerZoom) {
        fetchImage(nextIntegerZoom, imageCoords.x, imageCoords.y).then(url => {
          if (url) {
            setNextImage(url);
          }
        });
      }
    }
  }, [zoomLevel, lastIntegerZoom, imageCoords, fetchImage]);

  // Initialize with first image at center
  useEffect(() => {
    const centerX = Math.round(IMAGE_WIDTH / 2);
    const centerY = Math.round(IMAGE_HEIGHT / 2);
    
    // Fetch initial image
    const init = async () => {
      const url = await fetchImage(1, centerX, centerY);
      if (url) {
        setCurrentImage(url);
      }
    };
    init();
  }, [fetchImage]); // Run when fetchImage is available

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
          setZoomLevel(prev => Math.max(prev - step, 1)); // Don't allow zoom below 1x
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
    setZoomLevel(prev => Math.max(1, Math.min(10, prev + delta))); // Don't allow zoom below 1x
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
            {currentImage && (
              <>
                <img
                  ref={imageRef}
                  src={currentImage}
                  alt="Zoomable image"
                  className="main-image"
                  draggable={false}
                  style={{
                    opacity: 1,
                    transformOrigin: 'top left'
                  }}
                />
                {nextImage && zoomLevel > lastIntegerZoom && (
                  <img
                    src={nextImage}
                    alt="Next zoom level"
                    className="main-image"
                    draggable={false}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      opacity: zoomLevel - lastIntegerZoom, // Smooth fade between zoom levels
                      transformOrigin: 'top left'
                    }}
                  />
                )}
              </>
            )}
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
              <button onClick={() => setZoomLevel(prev => Math.max(1, prev - 0.1))}>
                -
              </button>
              <button onClick={() => setZoomLevel(prev => Math.min(10, prev + 0.1))}>
                +
              </button>
            </div>
          </div>

          <div className="position-info">
            <h3>Position</h3>
            <p>Screen X: {position.x.toFixed(0)}px</p>
            <p>Screen Y: {position.y.toFixed(0)}px</p>
            <p>Image X: {imageCoords.x}</p>
            <p>Image Y: {imageCoords.y}</p>
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
