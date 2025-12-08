import React, { useState, useEffect } from 'react';
import { Menu, X, ChevronDown, ChevronUp } from 'lucide-react';
import ResizablePanels from './ResizablePanels';

const ResponsiveDisplay = ({
    scheduleSelectorPanel,
    scheduleViewerPanel,
    selectedGroupsPanel,
    overlapTogglePanel,
    scheduleRef,
    onOpenMobileMenu,
    onUncollapseLeftPanel
}) => {
    const [isMobile, setIsMobile] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSubjectsVisible, setIsSubjectsVisible] = useState(false);

    // Expose setIsMenuOpen through callback
    useEffect(() => {
        if (onOpenMobileMenu) {
            onOpenMobileMenu(() => setIsMenuOpen(true));
        }
    }, [onOpenMobileMenu]);

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
                onUncollapseLeft={onUncollapseLeftPanel}
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

                {/* Selected Subjects - Collapsible with Animation */}
                <div className={`border-t border-gray-700 overflow-hidden transition-all duration-150 ease-out ${isSubjectsVisible ? 'max-h-32' : 'max-h-0'
                    }`}>
                    <div className="overflow-y-auto h-full">
                        <div className="p-3">
                            {React.cloneElement(selectedGroupsPanel, {
                                isMobile: true,
                                showOnlySubjects: true,
                                horizontal: true
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Schedule Viewer (full screen) */}
            <div className="flex-1 overflow-auto relative" ref={scheduleRef}>
                {React.cloneElement(scheduleViewerPanel, { isMobile: true })}
            </div>

            {/* Mobile Sidebar Menu - Full Height with Animation */}
            {/* Overlay with fade animation - Fixed positioning */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-150 ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={() => setIsMenuOpen(false)}
            />

            {/* Sidebar - Slide animation */}
            <div className={`mobile-menu fixed top-0 left-0 w-80 h-[100dvh] bg-gray-900 border-r border-gray-700 z-50 flex flex-col transition-transform duration-150 ease-out ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>
                <div className="flex-1 overflow-hidden pb-safe">
                    {React.cloneElement(scheduleSelectorPanel, {
                        overlapToggle: overlapTogglePanel
                    })}
                </div>
            </div>
        </div>
    );
};

export default ResponsiveDisplay;
