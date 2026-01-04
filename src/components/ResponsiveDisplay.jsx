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
    onUncollapseLeftPanel,
    onCloseRightPanel
}) => {
    const [isMobile, setIsMobile] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSubjectsVisible, setIsSubjectsVisible] = useState(false);
    const [isSubjectsPanelOpen, setIsSubjectsPanelOpen] = useState(false);

    // Expose setIsMenuOpen through callback
    useEffect(() => {
        if (onOpenMobileMenu) {
            onOpenMobileMenu(() => setIsMenuOpen(true));
        }
    }, [onOpenMobileMenu]);

    // Expose setIsSubjectsPanelOpen through callback
    useEffect(() => {
        if (onCloseRightPanel) {
            onCloseRightPanel(() => setIsSubjectsPanelOpen(false));
        }
    }, [onCloseRightPanel]);

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

                        {/* Button to open subjects panel on the right */}
                        {selectedGroupsPanel.props.selectedGroups?.length > 0 && (
                            <button
                                onClick={() => setIsSubjectsPanelOpen(true)}
                                className="p-2 text-gray-400 hover:text-white transition-colors flex-shrink-0 relative"
                                aria-label="View selected subjects"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="9" y1="3" x2="9" y2="21"></line>
                                </svg>
                                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                    {selectedGroupsPanel.props.selectedGroups.length}
                                </span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Schedule Viewer (full screen) */}
            <div className="flex-1 overflow-auto relative" ref={scheduleRef}>
                {React.cloneElement(scheduleViewerPanel, { isMobile: true })}
            </div>

            {/* Mobile Sidebar Menu (Left) - Full Height with Animation */}
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

            {/* Selected Subjects Panel (Right) - Full Height with Animation */}
            {/* Overlay for subjects panel */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-150 ${isSubjectsPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={() => setIsSubjectsPanelOpen(false)}
            />

            {/* Subjects Panel - Slide from right */}
            <div className={`fixed top-0 right-0 w-80 h-[100dvh] bg-gray-900 border-l border-gray-700 z-50 flex flex-col transition-transform duration-150 ease-out ${isSubjectsPanelOpen ? 'translate-x-0' : 'translate-x-full'
                }`}>
                <div className="flex items-center justify-between p-3 border-b border-gray-700">
                    <h2 className="text-lg font-semibold text-white">Materias seleccionadas</h2>
                    <button
                        onClick={() => setIsSubjectsPanelOpen(false)}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                        aria-label="Close panel"
                    >
                        <X size={24} />
                    </button>
                </div>
                <div className="flex-1 overflow-hidden pb-safe">
                    {React.cloneElement(selectedGroupsPanel, {
                        hideHeader: true
                    })}
                </div>
            </div>
        </div>
    );
};

export default ResponsiveDisplay;
