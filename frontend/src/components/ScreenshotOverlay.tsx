import React, { useState, useEffect, useRef } from 'react';
import './ScreenshotOverlay.css';

export interface ScreenshotRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ScreenshotOverlayProps {
  visible: boolean;
  onCapture: (region: ScreenshotRegion) => void;
  onCancel: () => void;
}

export const ScreenshotOverlay: React.FC<ScreenshotOverlayProps> = ({
  visible,
  onCapture,
  onCancel,
}) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Calculate selection rectangle
  const getSelectionRect = (): ScreenshotRegion | null => {
    if (!startPoint || !currentPoint) return null;

    const x = Math.min(startPoint.x, currentPoint.x);
    const y = Math.min(startPoint.y, currentPoint.y);
    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);

    return { x, y, width, height };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsSelecting(true);
    setStartPoint({ x: e.clientX, y: e.clientY });
    setCurrentPoint({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isSelecting && !isDragging) {
      setCurrentPoint({ x: e.clientX, y: e.clientY });
    } else if (isDragging && dragHandle && startPoint) {
      // Dragging a handle to resize
      const newPoint = { x: e.clientX, y: e.clientY };

      switch (dragHandle) {
        case 'nw':
          setStartPoint(newPoint);
          break;
        case 'ne':
          setStartPoint({ x: startPoint.x, y: newPoint.y });
          setCurrentPoint({ x: newPoint.x, y: currentPoint!.y });
          break;
        case 'sw':
          setStartPoint({ x: newPoint.x, y: startPoint.y });
          setCurrentPoint({ x: currentPoint!.x, y: newPoint.y });
          break;
        case 'se':
          setCurrentPoint(newPoint);
          break;
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging) {
      // Finished dragging
      setIsDragging(false);
      setDragHandle(null);
      return;
    }

    if (!isSelecting || e.button !== 0) return;

    const rect = getSelectionRect();
    if (rect && rect.width > 10 && rect.height > 10) {
      // Only capture if selection is large enough
      onCapture(rect);
    }

    // Reset selection
    setIsSelecting(false);
    setStartPoint(null);
    setCurrentPoint(null);
  };

  const handleHandleMouseDown = (handle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragHandle(handle);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
      setIsSelecting(false);
      setStartPoint(null);
      setCurrentPoint(null);
    }
  };

  useEffect(() => {
    if (visible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [visible]);

  if (!visible) return null;

  const selectionRect = getSelectionRect();

  return (
    <div
      ref={overlayRef}
      className="screenshot-overlay"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Dimmed overlay */}
      <div className="overlay-dim" />

      {/* Selection rectangle */}
      {selectionRect && (
        <div
          className="selection-rect"
          style={{
            left: `${selectionRect.x}px`,
            top: `${selectionRect.y}px`,
            width: `${selectionRect.width}px`,
            height: `${selectionRect.height}px`,
          }}
        >
          {/* Corner handles */}
          <div
            className="handle handle-nw"
            onMouseDown={(e) => handleHandleMouseDown('nw', e)}
          />
          <div
            className="handle handle-ne"
            onMouseDown={(e) => handleHandleMouseDown('ne', e)}
          />
          <div
            className="handle handle-sw"
            onMouseDown={(e) => handleHandleMouseDown('sw', e)}
          />
          <div
            className="handle handle-se"
            onMouseDown={(e) => handleHandleMouseDown('se', e)}
          />

          {/* Dimension display */}
          <div className="dimension-display">
            {selectionRect.width} × {selectionRect.height}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="instructions">
        {!isSelecting ? (
          <span>Click and drag to select a region • Press ESC to cancel</span>
        ) : (
          <span>Release to capture • Press ESC to cancel</span>
        )}
      </div>
    </div>
  );
};
