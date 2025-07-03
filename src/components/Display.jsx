import React, { useState, useRef } from 'react';
import ScheduleSelector from './ScheduleSelector';
import ExportLayout from './ExportLayout';
import ScheduleViewer from './ScheduleViewer';
import SelectedGroupsPanel from './SelectedGroupsPanel';
import { saveScheduleAsPng } from '../utils/scheduleUtils';
import SavePopup from './SavePopup';

const CustomAlert = ({ message, onClose }) => (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-[90%] max-w-md bg-red-900/80 border border-red-500 text-white px-5 py-4 rounded-lg shadow-xl backdrop-blur-sm">
        <div className="flex items-start">
            <div className="flex-shrink-0 mr-3">
                <svg className="h-6 w-6 text-red-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <div className="flex-1 ml-1">
                <p className="text-sm font-medium">{message}</p>
            </div>
            <button
                onClick={onClose}
                className="ml-3 flex-shrink-0 text-red-300 hover:text-white transition-colors"
                aria-label="Close alert"
            >
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
    </div>
);

const Display = ({ semestre, setSemestre }) => {
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [conflictAlert, setConflictAlert] = useState(null);
    const [currentScheduleName, setCurrentScheduleName] = useState('');
    const [showSavePopup, setShowSavePopup] = useState(false);
    const [savePopupMessage, setSavePopupMessage] = useState('');
    const scheduleRef = useRef(null);
    const exportRef = useRef(null);

    // Utility function to convert time string to minutes
    const timeToMinutes = (time) => {
        if (!time) return null;
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };

    // Parse time string with support for both formats
    const parseTimeString = (timeStr) => {
        if (!timeStr || timeStr === 'Horario no especificado') return [null, null];

        // Handle format "HH:MM a HH:MM"
        if (timeStr.includes('a')) {
            const [startTime, endTime] = timeStr.split('a').map(t => t.trim());
            return [timeToMinutes(startTime), timeToMinutes(endTime)];
        }

        // Handle format "HH:MM - HH:MM"
        if (timeStr.includes('-')) {
            const [startTime, endTime] = timeStr.split('-').map(t => t.trim());
            return [timeToMinutes(startTime), timeToMinutes(endTime)];
        }

        return [null, null];
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
            const [profStart, profEnd] = parseTimeString(schedule.horario);
            const profDays = schedule.dias || [];

            if (profStart !== null && profEnd !== null) {
                profDays.forEach(day => {
                    newSlots.push({ day, start: profStart, end: profEnd });
                });
            }
        });

        // Handle assistants
        newGroup.assistants?.forEach(assistant => {
            if (!assistant.horario || !assistant.dias || assistant.dias.length === 0) return;

            const [astStart, astEnd] = parseTimeString(assistant.horario);
            const assistantDays = assistant.dias || [];

            if (astStart !== null && astEnd !== null) {
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
                const [existingProfStart, existingProfEnd] = parseTimeString(schedule.horario);
                const existingProfDays = schedule.dias || [];

                if (existingProfStart !== null && existingProfEnd !== null) {
                    existingProfDays.forEach(day => {
                        existingSlots.push({ day, start: existingProfStart, end: existingProfEnd });
                    });
                }
            });

            // Handle existing assistants
            existingGroup.assistants?.forEach(assistant => {
                if (!assistant.horario || !assistant.dias || assistant.dias.length === 0) return;

                const [start, end] = parseTimeString(assistant.horario);
                const assistantDays = assistant.dias || [];

                if (start !== null && end !== null) {
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

    // Handle group selection
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

        // Check if there's already a group from the same subject
        const sameSubjectGroup = selectedGroups.find(g => g.subject === subject);
        if (sameSubjectGroup) {
            setConflictAlert(`Ya tienes seleccionado el grupo ${sameSubjectGroup.group} de la materia ${subject}. No puedes seleccionar múltiples grupos de la misma materia.`);
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
            assistants: groupData.ayudantes,
            salon: groupData.salon || null,
            modalidad: groupData.modalidad || null
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
            setShowSavePopup(true);
        }, 100);
    };

    return (
        <div className="flex h-[100dvh] overflow-hidden">
            {conflictAlert && (
                <CustomAlert
                    message={conflictAlert}
                    onClose={() => setConflictAlert(null)}
                />
            )}
            <div className="w-80 flex-shrink-0">
                <ScheduleSelector
                    semestre={semestre}
                    setSemestre={setSemestre}
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
                setShowSavePopup={setShowSavePopup}
            />
            <ExportLayout
                ref={exportRef}
                selectedGroups={selectedGroups}
                schedule={
                    <ScheduleViewer
                        selectedGroups={selectedGroups}
                        scheduleName={currentScheduleName}
                        isExport={true}
                    />
                }
            />
            {showSavePopup && (
                <SavePopup onClose={() => setShowSavePopup(false)} />
            )}
        </div>
    );
};

export default Display;