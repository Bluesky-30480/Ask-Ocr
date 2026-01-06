import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Maximize2 } from 'lucide-react';
import { appWindow } from '@tauri-apps/api/window';
import { PhysicalPosition } from '@tauri-apps/api/window';
import { currentMonitor } from '@tauri-apps/api/window';
import './FloatingBall.css';

interface FloatingBallProps {
  onExpand: () => void;
}

type DockSide = 'none' | 'left' | 'right' | 'top';

export const FloatingBall: React.FC<FloatingBallProps> = ({ onExpand }) => {
  const dragTimeout = useRef<number | null>(null);
  const dragStarted = useRef(false);
  const [docked, setDocked] = useState<DockSide>('none');
  const [isHovering, setIsHovering] = useState(false);
  const checkPositionInterval = useRef<number | null>(null);
  const lastPosition = useRef<{ x: number; y: number } | null>(null);

  const DOCK_THRESHOLD = 50; // Bigger detection area - Distance from edge to trigger docking
  const VISIBLE_SLIVER = 8; // How much to show when docked (px) - just a small peek

  const clearDrag = () => {
    if (dragTimeout.current !== null) {
      clearTimeout(dragTimeout.current);
      dragTimeout.current = null;
    }
    dragStarted.current = false;
  };

  // Check if window is near screen edge and dock if needed
  const checkAndDock = useCallback(async () => {
    try {
      const monitor = await currentMonitor();
      if (!monitor) return;

      const windowPos = await appWindow.outerPosition();
      const windowSize = await appWindow.outerSize();
      const screenSize = monitor.size;
      const screenPos = monitor.position;

      const windowX = windowPos.x;
      const windowY = windowPos.y;
      const windowWidth = windowSize.width;
      const windowHeight = windowSize.height;
      const screenWidth = screenSize.width;
      const screenX = screenPos.x;
      const screenY = screenPos.y;

      // Calculate screen boundaries
      const screenLeft = screenX;
      const screenRight = screenX + screenWidth;
      const screenTop = screenY;

      // Check which edge the window is near
      const nearLeft = windowX <= screenLeft + DOCK_THRESHOLD;
      const nearRight = windowX + windowWidth >= screenRight - DOCK_THRESHOLD;
      const nearTop = windowY <= screenTop + DOCK_THRESHOLD;

      let newDockSide: DockSide = 'none';
      let newX = windowX;
      let newY = windowY;

      // QQ-style docking: hide most of the ball, show just a sliver
      if (nearLeft && !isHovering) {
        newDockSide = 'left';
        newX = screenLeft - windowWidth + VISIBLE_SLIVER; // Show only VISIBLE_SLIVER pixels
      } else if (nearRight && !isHovering) {
        newDockSide = 'right';
        newX = screenRight - VISIBLE_SLIVER; // Show only VISIBLE_SLIVER pixels
      } else if (nearTop && !isHovering) {
        newDockSide = 'top';
        newY = screenTop - windowHeight + VISIBLE_SLIVER; // Show only VISIBLE_SLIVER pixels
      }

      if (newDockSide !== 'none' && newDockSide !== docked) {
        setDocked(newDockSide);
        await appWindow.setPosition(new PhysicalPosition(Math.round(newX), Math.round(newY)));
      } else if (newDockSide === 'none' && docked !== 'none') {
        setDocked('none');
      }

      lastPosition.current = { x: windowX, y: windowY };
    } catch (e) {
      console.error('Error checking dock position:', e);
    }
  }, [docked, isHovering]);

  // Undock and show full ball when hovering
  const handleMouseEnter = useCallback(async () => {
    setIsHovering(true);
    
    if (docked !== 'none') {
      try {
        const monitor = await currentMonitor();
        if (!monitor) return;

        const windowPos = await appWindow.outerPosition();
        const windowSize = await appWindow.outerSize();
        const screenSize = monitor.size;
        const screenPos = monitor.position;

        let newX = windowPos.x;
        let newY = windowPos.y;

        if (docked === 'left') {
          newX = screenPos.x;
        } else if (docked === 'right') {
          newX = screenPos.x + screenSize.width - windowSize.width;
        } else if (docked === 'top') {
          newY = screenPos.y;
        }

        await appWindow.setPosition(new PhysicalPosition(Math.round(newX), Math.round(newY)));
      } catch (e) {
        console.error('Error undocking:', e);
      }
    }
  }, [docked]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    // Check if we should dock again after mouse leaves
    setTimeout(() => {
      if (!isHovering) {
        checkAndDock();
      }
    }, 500);
  }, [checkAndDock, isHovering]);

  const handleMouseDown = () => {
    clearDrag();
    setDocked('none'); // Undock when starting to drag
    dragTimeout.current = window.setTimeout(async () => {
      dragStarted.current = true;
      await appWindow.startDragging();
    }, 120);
  };

  const handleMouseUp = () => {
    const wasDrag = dragStarted.current;
    clearDrag();
    if (!wasDrag) {
      onExpand();
    } else {
      // After drag ends, check if we should dock
      setTimeout(checkAndDock, 100);
    }
  };

  // Monitor position changes after dragging
  useEffect(() => {
    const startPositionCheck = () => {
      checkPositionInterval.current = window.setInterval(async () => {
        if (!dragStarted.current) {
          const pos = await appWindow.outerPosition();
          const currentPos = { x: pos.x, y: pos.y };
          
          // If position changed and we're not dragging, check for docking
          if (lastPosition.current && 
              (currentPos.x !== lastPosition.current.x || currentPos.y !== lastPosition.current.y)) {
            checkAndDock();
          }
          lastPosition.current = currentPos;
        }
      }, 500);
    };

    startPositionCheck();

    return () => {
      clearDrag();
      if (checkPositionInterval.current) {
        clearInterval(checkPositionInterval.current);
      }
    };
  }, [checkAndDock]);

  // Check docking on mount
  useEffect(() => {
    checkAndDock();
  }, []);

  const getDockedClass = () => {
    if (docked === 'none' || isHovering) return '';
    return `docked-${docked}`;
  };

  return (
    <div 
      className={`floating-ball-container ${getDockedClass()}`} 
      data-tauri-drag-region
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`floating-ball ${docked !== 'none' && !isHovering ? 'ball-docked' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={clearDrag}
      >
        <div className="floating-ball-content">
          <div className="logo-icon-ball">B</div>
          <div className="expand-overlay">
            <Maximize2 size={20} color="white" />
          </div>
        </div>
        {/* Dock indicator - shows a peek line when docked */}
        {docked !== 'none' && !isHovering && (
          <div className={`dock-indicator dock-indicator-${docked}`} />
        )}
      </div>
    </div>
  );
};
