import React, { useState, useEffect } from 'react';
import { Menu, X, ChevronDown, ChevronUp } from 'lucide-react';
import ResizablePanels from './ResizablePanels';

const ResponsiveDisplay = ({
    scheduleSelectorPanel,
    scheduleViewerPanel,
    selectedGroupsPanel,
    overlapTogglePanel,
    scheduleRef
}) => {
    const [isMobile, setIsMobile] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSubjectsVisible, setIsSubjectsVisible] = useState(true);

    // Check if we're on mobile - be more explicit about breakpoints
    useEffect(() => {
        let timeoutId;

        const checkMobile = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                const isMobileSize = window.innerWidth < 768; // md breakpoint in Tailwind
                setIsMobile(isMobileSize);
            }, 100); // Debounce resize events
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => {
            window.removeEventListener('resize', checkMobile);
            clearTimeout(timeoutId);
        };
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isMenuOpen && !event.target.closest('.mobile-menu') && !event.target.closest('.hamburger-btn')) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMenuOpen]);

    if (!isMobile) {
        // Desktop layout - use ResizablePanels
        return (
            <ResizablePanels
                leftPanel={
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="flex-1 overflow-hidden">
                            {scheduleSelectorPanel}
                        </div>
                        {overlapTogglePanel}
                    </div>
                }
                centerPanel={
                    <div className="h-full overflow-hidden" ref={scheduleRef}>
                        {scheduleViewerPanel}
                    </div>
                }
                rightPanel={
                    <div className="h-full overflow-hidden">
                        {selectedGroupsPanel}
                    </div>
                }
                defaultLeftWidth={320}
                defaultRightWidth={320}
                minLeftWidth={200}
                maxLeftWidth={500}
                minRightWidth={200}
                maxRightWidth={500}
                minCenterWidth={300}
            />
        );
    }

    // Mobile layout - Google Calendar style
    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-gray-900">
            {/* Mobile Header - Always visible */}
            <div className="flex-shrink-0 bg-gray-900 border-b border-gray-700">
                {/* Title and Action Buttons Row */}
                <div className="flex items-center justify-between p-3">
                    <div className="flex items-center flex-1">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="hamburger-btn p-2 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                            aria-label="Toggle menu"
                        >
                            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>

                        <div className="flex-1 mx-3">
                            {/* Pass props for title and buttons only */}
                            {React.cloneElement(selectedGroupsPanel, {
                                isMobile: true,
                                showOnlyHeader: true
                            })}
                        </div>
                    </div>
                </div>

                {/* Toggle for subjects visibility */}
                {selectedGroupsPanel.props.selectedGroups?.length > 0 && (
                    <div className="border-t border-gray-700">
                        <button
                            onClick={() => setIsSubjectsVisible(!isSubjectsVisible)}
                            className="w-full flex items-center justify-center p-2 text-gray-400 hover:text-white transition-colors"
                        >
                            <span className="text-sm mr-1">
                                Materias seleccionadas ({selectedGroupsPanel.props.selectedGroups.length})
                            </span>
                            {isSubjectsVisible ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>
                )}

                {/* Selected Subjects - Collapsible */}
                {isSubjectsVisible && (
                    <div className="border-t border-gray-700 max-h-32 overflow-y-auto">
                        <div className="p-3">
                            {React.cloneElement(selectedGroupsPanel, {
                                isMobile: true,
                                showOnlySubjects: true,
                                horizontal: true
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Schedule Viewer (full screen) */}
            <div className="flex-1 overflow-auto relative" ref={scheduleRef}>
                {React.cloneElement(scheduleViewerPanel, { isMobile: true })}

                {/* Mobile Sidebar Menu - Full Height */}
                {isMenuOpen && (
                    <>
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/50 z-40" />

                        {/* Sidebar - Full screen height */}
                        <div className="mobile-menu fixed top-0 left-0 w-80 h-screen bg-gray-900 border-r border-gray-700 z-50 flex flex-col">
                            <div className="flex-1 overflow-hidden">
                                {scheduleSelectorPanel}
                            </div>
                            {overlapTogglePanel}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ResponsiveDisplay;
