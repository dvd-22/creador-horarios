import React, { useState, useRef } from 'react';
import ScheduleSelector from './ScheduleSelector';
import ExportLayout from './ExportLayout';
import ScheduleViewer from './ScheduleViewer';
import SelectedGroupsPanel from './SelectedGroupsPanel';
import { saveScheduleAsPng } from '../utils/scheduleUtils';
import SavePopup from './SavePopup';
import { List, Calendar, Settings } from 'lucide-react';

const CustomAlert = ({ message, onClose }) => (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-[90%] max-w-2xl bg-red-900/50 border border-red-500 text-red-100 px-4 py-3 rounded shadow-lg">
        <span className="block sm:inline">{message}</span>
        <button
            onClick={onClose}
            className="absolute top-0 right-0 px-4 py-3"
            aria-label="Close alert"
        >
            <span className="text-2xl">&times;</span>
        </button>
    </div>
);

const ScheduleDisplay = () => {
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [conflictAlert, setConflictAlert] = useState(null);
    const [currentScheduleName, setCurrentScheduleName] = useState('');
    const [showSavePopup, setShowSavePopup] = useState(false);
    const [activeTab, setActiveTab] = useState('courses'); // For mobile navigation
    const scheduleRef = useRef(null);
    const exportRef = useRef(null);

    // Utility function to convert time string to minutes
    const timeToMinutes = (time) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };

    // Check if two time ranges overlap
    const hasTimeOverlap = (start1, end1, start2, end2) => {
        return start1 < end2 && start2 < end1;
    };

    // Check if a new group conflicts with existing selected groups
    const checkConflicts = (newGroup) => {
        const newSlots = [];

        // Handle multiple professor schedules
        newGroup.professor.horarios?.forEach(schedule => {
            const [profStart, profEnd] = (schedule.horario || '').split(' - ').map(timeToMinutes);
            const profDays = schedule.dias || [];

            if (profStart !== null && profEnd !== null) {
                profDays.forEach(day => {
                    newSlots.push({ day, start: profStart, end: profEnd });
                });
            }
        });

        // Handle assistants (unchanged)
        newGroup.assistants?.forEach(assistant => {
            const [astStart, astEnd] = (assistant.horario || '').split(' - ').map(timeToMinutes);
            const assistantDays = assistant.dias || [];

            if (astStart !== null && astEnd !== null && assistantDays.length > 0) {
                assistantDays.forEach(day => {
                    newSlots.push({ day, start: astStart, end: astEnd });
                });
            }
        });

        // Check against existing groups
        for (const existingGroup of selectedGroups) {
            if (existingGroup.semester === newGroup.semester &&
                existingGroup.subject === newGroup.subject &&
                existingGroup.group === newGroup.group) {
                continue;
            }

            const existingSlots = [];

            // Handle multiple professor schedules for existing groups
            existingGroup.professor.horarios?.forEach(schedule => {
                const [existingProfStart, existingProfEnd] = (schedule.horario || '').split(' - ').map(timeToMinutes);
                const existingProfDays = schedule.dias || [];

                if (existingProfStart !== null && existingProfEnd !== null) {
                    existingProfDays.forEach(day => {
                        existingSlots.push({ day, start: existingProfStart, end: existingProfEnd });
                    });
                }
            });

            // Handle existing assistants (unchanged)
            existingGroup.assistants?.forEach(assistant => {
                const [start, end] = (assistant.horario || '').split(' - ').map(timeToMinutes);
                const assistantDays = assistant.dias || [];

                if (start !== null && end !== null && assistantDays.length > 0) {
                    assistantDays.forEach(day => {
                        existingSlots.push({ day, start, end });
                    });
                }
            });

            // Check for conflicts
            for (const newSlot of newSlots) {
                for (const existingSlot of existingSlots) {
                    if (newSlot.day === existingSlot.day &&
                        hasTimeOverlap(newSlot.start, newSlot.end, existingSlot.start, existingSlot.end)) {
                        return {
                            conflictWith: existingGroup,
                            day: newSlot.day,
                            newTime: `${Math.floor(newSlot.start / 60)}:${String(newSlot.start % 60).padStart(2, '0')} - ${Math.floor(newSlot.end / 60)}:${String(newSlot.end % 60).padStart(2, '0')}`,
                            existingTime: `${Math.floor(existingSlot.start / 60)}:${String(existingSlot.start % 60).padStart(2, '0')} - ${Math.floor(existingSlot.end / 60)}:${String(existingSlot.end % 60).padStart(2, '0')}`
                        };
                    }
                }
            }
        }

        return null;
    };

    // Update the handleGroupSelect function
    const handleGroupSelect = (semester, subject, group, groupData) => {
        const isSelected = selectedGroups.some(g =>
            g.semester === semester &&
            g.subject === subject &&
            g.group === group
        );

        if (isSelected) {
            setSelectedGroups(prev => prev.filter(g =>
                !(g.semester === semester &&
                    g.subject === subject &&
                    g.group === group)
            ));
            setConflictAlert(null);
            return;
        }

        const newGroup = {
            semester,
            subject,
            group,
            professor: {
                ...groupData.profesor,
                horarios: groupData.profesor.horarios || []
            },
            assistants: groupData.ayudantes
        };

        const conflict = checkConflicts(newGroup);

        if (conflict) {
            const message = `No se puede agregar ${subject} (Grupo ${group}) porque se traslapa con ${conflict.conflictWith.subject} (Grupo ${conflict.conflictWith.group}).`;
            setConflictAlert(message);
            return;
        }

        setSelectedGroups(prev => [...prev, newGroup]);
        setConflictAlert(null);
    };

    const handleSaveSchedule = (name) => {
        setCurrentScheduleName(name);
        setTimeout(() => {
            saveScheduleAsPng(exportRef, name);
            setShowSavePopup(true); // Show popup after saving
        }, 100);
    };

    return (
        <div className="h-[100dvh] overflow-hidden">
            {conflictAlert && (
                <CustomAlert
                    message={conflictAlert}
                    onClose={() => setConflictAlert(null)}
                />
            )}

            {/* Desktop Layout */}
            <div className="hidden lg:flex h-full">
                <div className="w-80 flex-shrink-0">
                    <ScheduleSelector
                        onGroupSelect={handleGroupSelect}
                        selectedGroups={selectedGroups}
                    />
                </div>
                <div className="flex-1" ref={scheduleRef}>
                    <ScheduleViewer
                        selectedGroups={selectedGroups}
                        onRemoveGroup={handleGroupSelect}
                        scheduleName={currentScheduleName}
                    />
                </div>
                <SelectedGroupsPanel
                    selectedGroups={selectedGroups}
                    onRemoveGroup={handleGroupSelect}
                    onSaveSchedule={handleSaveSchedule}
                />
            </div>

            {/* Mobile Layout */}
            <div className="lg:hidden flex flex-col h-full">
                {/* Mobile Tab Navigation */}
                <div className="flex bg-gray-900 border-b border-gray-700">
                    <button
                        onClick={() => setActiveTab('courses')}
                        className={`flex-1 flex items-center justify-center py-3 px-4 text-sm font-medium transition-colors ${activeTab === 'courses'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                            }`}
                    >
                        <List size={18} className="mr-2" />
                        Materias
                    </button>
                    <button
                        onClick={() => setActiveTab('schedule')}
                        className={`flex-1 flex items-center justify-center py-3 px-4 text-sm font-medium transition-colors ${activeTab === 'schedule'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                            }`}
                    >
                        <Calendar size={18} className="mr-2" />
                        Horario
                    </button>
                    <button
                        onClick={() => setActiveTab('selected')}
                        className={`flex-1 flex items-center justify-center py-3 px-4 text-sm font-medium transition-colors relative ${activeTab === 'selected'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                            }`}
                    >
                        <Settings size={18} className="mr-2" />
                        Seleccionadas
                        {selectedGroups.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                {selectedGroups.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Mobile Tab Content */}
                <div className="flex-1 overflow-hidden">
                    {activeTab === 'courses' && (
                        <ScheduleSelector
                            onGroupSelect={handleGroupSelect}
                            selectedGroups={selectedGroups}
                        />
                    )}
                    {activeTab === 'schedule' && (
                        <div className="h-full overflow-auto" ref={scheduleRef}>
                            <ScheduleViewer
                                selectedGroups={selectedGroups}
                                onRemoveGroup={handleGroupSelect}
                                scheduleName={currentScheduleName}
                                isMobile={true}
                            />
                        </div>
                    )}
                    {activeTab === 'selected' && (
                        <SelectedGroupsPanel
                            selectedGroups={selectedGroups}
                            onRemoveGroup={handleGroupSelect}
                            onSaveSchedule={handleSaveSchedule}
                            isMobile={true}
                        />
                    )}
                </div>
            </div>

            <ExportLayout
                ref={exportRef}
                selectedGroups={selectedGroups}
                schedule={
                    <ScheduleViewer
                        selectedGroups={selectedGroups}
                        scheduleName={currentScheduleName}
                    />
                }
            />
            {showSavePopup && (
                <SavePopup onClose={() => setShowSavePopup(false)} />
            )}
        </div>
    );
};

export default ScheduleDisplay;