import React, { useState, useRef } from 'react';
import ScheduleSelector from './ScheduleSelector';
import ExportLayout from './ExportLayout';
import ScheduleViewer from './ScheduleViewer';
import SelectedGroupsPanel from './SelectedGroupsPanel';
import { saveScheduleAsPng } from '../utils/scheduleUtils';

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
    
        // Add professor slots with null checks
        const profDays = newGroup.professor.dias || [];
        const [profStart, profEnd] = (newGroup.professor.horario || '').split(' - ').map(timeToMinutes);
        
        if (profStart !== null && profEnd !== null) {
            profDays.forEach(day => {
                newSlots.push({ day, start: profStart, end: profEnd });
            });
        }
    
        // Add assistant slots with null checks
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
            // Skip if it's the same group being toggled off
            if (existingGroup.semester === newGroup.semester &&
                existingGroup.subject === newGroup.subject &&
                existingGroup.group === newGroup.group) {
                continue;
            }
    
            const existingSlots = [];
    
            // Add existing professor slots with null checks
            const existingProfDays = existingGroup.professor.dias || [];
            const [existingProfStart, existingProfEnd] = (existingGroup.professor.horario || '').split(' - ').map(timeToMinutes);
            
            if (existingProfStart !== null && existingProfEnd !== null) {
                existingProfDays.forEach(day => {
                    existingSlots.push({ day, start: existingProfStart, end: existingProfEnd });
                });
            }
    
            // Add existing assistant slots with null checks
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

    const handleGroupSelect = (semester, subject, group, groupData) => {
        const isSelected = selectedGroups.some(g =>
            g.semester === semester &&
            g.subject === subject &&
            g.group === group
        );

        // If deselecting, always allow
        if (isSelected) {
            setSelectedGroups(prev => prev.filter(g =>
                !(g.semester === semester &&
                    g.subject === subject &&
                    g.group === group)
            ));
            setConflictAlert(null);
            return;
        }

        // Check for conflicts when selecting
        const newGroup = {
            semester,
            subject,
            group,
            professor: groupData.profesor,
            assistants: groupData.ayudantes
        };

        const conflict = checkConflicts(newGroup);

        if (conflict) {
            const message = `No se puede agregar ${subject} (Grupo ${group}) porque se traslapa con ${conflict.conflictWith.subject} (Grupo ${conflict.conflictWith.group}).`;
            setConflictAlert(message);
            return;
        }

        // If no conflicts, add the group
        setSelectedGroups(prev => [...prev, newGroup]);
        setConflictAlert(null);
    };

    const handleSaveSchedule = (name) => {
        setCurrentScheduleName(name);
        setTimeout(() => {
            saveScheduleAsPng(exportRef, name);
        }, 100);
    };

    return (
        <div className="flex h-screen overflow-hidden">
            {conflictAlert && (
                <CustomAlert
                    message={conflictAlert}
                    onClose={() => setConflictAlert(null)}
                />
            )}
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
        </div>
    );
};

export default ScheduleDisplay;