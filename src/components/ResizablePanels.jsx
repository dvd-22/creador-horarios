import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const ResizablePanels = ({
    leftPanel,
    centerPanel,
    rightPanel,
    defaultLeftWidth = 320, // 20rem (w-80)
    defaultRightWidth = 320, // 20rem 
    minLeftWidth = 240, // 15rem
    maxLeftWidth = 500, // 31.25rem
    minRightWidth = 240, // 15rem
    maxRightWidth = 500, // 31.25rem
    minCenterWidth = 400, // Minimum width for center panel
    collapseThreshold = 120, // Width below which panel collapses
    className = "",
    onUncollapseLeft // Callback to expose uncollapse function
}) => {
    const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
    const [rightWidth, setRightWidth] = useState(defaultRightWidth);
    const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
    const [isRightCollapsed, setIsRightCollapsed] = useState(false);
    const [isDraggingLeft, setIsDraggingLeft] = useState(false);
    const [isDraggingRight, setIsDraggingRight] = useState(false);
    const containerRef = useRef(null);

    // Toggle functions for collapsed panels
    const toggleLeftPanel = useCallback(() => {
        if (isLeftCollapsed) {
            setIsLeftCollapsed(false);
            setLeftWidth(defaultLeftWidth);
        } else {
            setIsLeftCollapsed(true);
        }
    }, [isLeftCollapsed, defaultLeftWidth]);

    const toggleRightPanel = useCallback(() => {
        if (isRightCollapsed) {
            setIsRightCollapsed(false);
            setRightWidth(defaultRightWidth);
        } else {
            setIsRightCollapsed(true);
        }
    }, [isRightCollapsed, defaultRightWidth]);

    // Expose uncollapse function
    useEffect(() => {
        if (onUncollapseLeft) {
            onUncollapseLeft(() => {
                if (isLeftCollapsed) {
                    setIsLeftCollapsed(false);
                    setLeftWidth(defaultLeftWidth);
                    return true; // Panel was collapsed, now uncollapsing
                }
                return false; // Panel was already expanded
            });
        }
    }, [onUncollapseLeft, isLeftCollapsed, defaultLeftWidth]);

    // Handle left splitter drag
    const handleLeftMouseDown = useCallback((e) => {
        e.preventDefault();
        setIsDraggingLeft(true);
    }, []);

    // Handle right splitter drag
    const handleRightMouseDown = useCallback((e) => {
        e.preventDefault();
        setIsDraggingRight(true);
    }, []);

    // Handle mouse move for dragging
    const handleMouseMove = useCallback((e) => {
        if (!containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const containerWidth = containerRect.width;

        if (isDraggingLeft) {
            const mouseX = e.clientX - containerRect.left;
            let newLeftWidth = Math.max(0, Math.min(maxLeftWidth, mouseX));

            // Calculate remaining space for center + right
            const remainingSpace = containerWidth - newLeftWidth;
            const requiredSpace = minCenterWidth + (isRightCollapsed ? 0 : Math.max(minRightWidth, rightWidth));

            // If not enough space, adjust
            if (remainingSpace < requiredSpace) {
                newLeftWidth = Math.max(0, containerWidth - requiredSpace);
            }

            if (newLeftWidth < collapseThreshold) {
                setIsLeftCollapsed(true);
            } else {
                setIsLeftCollapsed(false);
                setLeftWidth(Math.max(minLeftWidth, newLeftWidth));
            }
        }

        if (isDraggingRight) {
            const mouseX = e.clientX - containerRect.left;
            let newRightWidth = Math.max(0, Math.min(maxRightWidth, containerWidth - mouseX));

            // Calculate remaining space for left + center
            const remainingSpace = containerWidth - newRightWidth;
            const requiredSpace = minCenterWidth + (isLeftCollapsed ? 0 : Math.max(minLeftWidth, leftWidth));

            // If not enough space, adjust
            if (remainingSpace < requiredSpace) {
                newRightWidth = Math.max(0, containerWidth - requiredSpace);
            }

            if (newRightWidth < collapseThreshold) {
                setIsRightCollapsed(true);
            } else {
                setIsRightCollapsed(false);
                setRightWidth(Math.max(minRightWidth, newRightWidth));
            }
        }
    }, [isDraggingLeft, isDraggingRight, minLeftWidth, maxLeftWidth, minRightWidth, maxRightWidth, minCenterWidth, collapseThreshold, leftWidth, rightWidth, isLeftCollapsed, isRightCollapsed]);

    // Handle mouse up to stop dragging
    const handleMouseUp = useCallback(() => {
        setIsDraggingLeft(false);
        setIsDraggingRight(false);
    }, []);

    // Add global mouse event listeners when dragging
    useEffect(() => {
        if (isDraggingLeft || isDraggingRight) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            };
        }
    }, [isDraggingLeft, isDraggingRight, handleMouseMove, handleMouseUp]);

    return (
        <div className={`flex h-full w-full overflow-hidden bg-gray-900 ${className}`} ref={containerRef}>
            {/* Left Panel */}
            {isLeftCollapsed ? (
                <div className="flex-shrink-0 w-12 bg-gray-900 border-r border-gray-700 flex flex-col items-center py-4">
                    <button
                        onClick={toggleLeftPanel}
                        className="bg-gray-800 text-gray-400 hover:text-gray-100 p-1 rounded border border-gray-700"
                        aria-label="Expand left panel"
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>
            ) : (
                <>
                    <div
                        className="flex-shrink-0 flex flex-col overflow-hidden"
                        style={{ width: `${leftWidth}px` }}
                    >
                        {leftPanel}
                    </div>

                    {/* Left Splitter */}
                    <div
                        className={`w-1 bg-gray-700 hover:bg-blue-500 cursor-col-resize transition-colors flex-shrink-0 ${isDraggingLeft ? 'bg-blue-500' : ''
                            }`}
                        onMouseDown={handleLeftMouseDown}
                    >
                        <div className="w-full h-full" />
                    </div>
                </>
            )}

            {/* Center Panel */}
            <div className="flex-1 overflow-hidden min-w-0">
                {centerPanel}
            </div>

            {/* Right Panel */}
            {isRightCollapsed ? (
                <div className="flex-shrink-0 w-12 bg-gray-900 border-l border-gray-700 flex flex-col items-center py-4">
                    <button
                        onClick={toggleRightPanel}
                        className="bg-gray-800 text-gray-400 hover:text-gray-100 p-1 rounded border border-gray-700"
                        aria-label="Expand right panel"
                    >
                        <ChevronLeft size={14} />
                    </button>
                </div>
            ) : (
                <>
                    {/* Right Splitter */}
                    <div
                        className={`w-1 bg-gray-700 hover:bg-blue-500 cursor-col-resize transition-colors flex-shrink-0 ${isDraggingRight ? 'bg-blue-500' : ''
                            }`}
                        onMouseDown={handleRightMouseDown}
                    >
                        <div className="w-full h-full" />
                    </div>

                    <div
                        className="flex-shrink-0 overflow-hidden"
                        style={{ width: `${rightWidth}px` }}
                    >
                        {rightPanel}
                    </div>
                </>
            )}
        </div>
    );
};

export default ResizablePanels;
