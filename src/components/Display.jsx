import React, { useState, useRef } from 'react';
import ScheduleSelector from './ScheduleSelector';
import ExportLayout from './ExportLayout';
import ScheduleViewer from './ScheduleViewer';
import SelectedGroupsPanel from './SelectedGroupsPanel';
import ResizablePanels from './ResizablePanels';
import { saveScheduleAsPng } from '../utils/scheduleUtils';
import SavePopup from './SavePopup';
import { MajorProvider } from '../contexts/MajorContext';

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

const OverlapToggle = ({ checked, onChange }) => (
    <div className="flex items-center space-x-2 px-4 py-2 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center">
            <label className="inline-flex relative items-center cursor-pointer">
                <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={checked}
                    onChange={onChange}
                />
                <div className="w-9 h-5 bg-gray-600 rounded-full peer peer-checked:bg-blue-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
            </label>
        </div>
        <span className="text-sm text-gray-300">Permitir traslapar materias</span>
    </div>
);

const Display = () => {
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [conflictAlert, setConflictAlert] = useState(null);
    const [scheduleTitle, setScheduleTitle] = useState('Mi horario');
    const [showSavePopup, setShowSavePopup] = useState(false);
    const [savePopupMessage, setSavePopupMessage] = useState('');
    const [allowOverlap, setAllowOverlap] = useState(false);
    const [showOverlapWarning, setShowOverlapWarning] = useState(false);
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
        if (allowOverlap) return null; // Skip conflict checking if overlaps are allowed

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

    // Check if any currently selected groups have overlapping schedules
    const hasOverlappingGroups = () => {
        // Array to track all time slots
        const allSlots = [];

        // Collect all time slots from all selected groups
        for (const group of selectedGroups) {
            // Handle professor schedules
            group.professor.horarios?.forEach(schedule => {
                const [profStart, profEnd] = parseTimeString(schedule.horario);
                const profDays = schedule.dias || [];

                if (profStart !== null && profEnd !== null) {
                    profDays.forEach(day => {
                        allSlots.push({
                            day,
                            start: profStart,
                            end: profEnd,
                            group: `${group.subject} (${group.group})`
                        });
                    });
                }
            });

            // Handle assistants' schedules
            group.assistants?.forEach(assistant => {
                if (!assistant.horario || !assistant.dias || assistant.dias.length === 0) return;

                const [astStart, astEnd] = parseTimeString(assistant.horario);
                const assistantDays = assistant.dias || [];

                if (astStart !== null && astEnd !== null) {
                    assistantDays.forEach(day => {
                        allSlots.push({
                            day,
                            start: astStart,
                            end: astEnd,
                            group: `${group.subject} (${group.group}) - Ayudantía`
                        });
                    });
                }
            });
        }

        // Check for overlaps
        for (let i = 0; i < allSlots.length; i++) {
            for (let j = i + 1; j < allSlots.length; j++) {
                const slotA = allSlots[i];
                const slotB = allSlots[j];

                if (slotA.day === slotB.day &&
                    hasTimeOverlap(slotA.start, slotA.end, slotB.start, slotB.end)) {
                    return true;
                }
            }
        }

        return false;
    };

    // Handle group selection
    const handleGroupSelect = (semester, subject, group, groupData, majorId = 'cs') => {
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

        // Add majorId and presentacion to the new group object
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
            modalidad: groupData.modalidad || null,
            presentacion: groupData.presentacion || null, // Add presentation link
            majorId // Store the majorId
        };

        // Only check for conflicts if overlap is not allowed
        if (!allowOverlap) {
            const conflict = checkConflicts(newGroup);
            if (conflict) {
                const message = `No se puede agregar ${subject} (Grupo ${group}) porque se traslapa con ${conflict.conflictWith.subject} (Grupo ${conflict.conflictWith.group}).`;
                setConflictAlert(message);
                return;
            }
        }

        setSelectedGroups(prev => [...prev, newGroup]);
        setConflictAlert(null);
    };

    const handleSaveSchedule = (title) => {
        setTimeout(() => {
            saveScheduleAsPng(exportRef, title);
            setShowSavePopup(true);
        }, 100);
    };

    const handleTitleChange = (newTitle) => {
        setScheduleTitle(newTitle);
    };

    // Handle toggle change
    const handleToggleOverlap = (e) => {
        const newValue = e.target.checked;

        // If turning off overlap and we have overlapping groups
        if (!newValue && hasOverlappingGroups()) {
            setShowOverlapWarning(true);
        } else {
            setAllowOverlap(newValue);
        }
    };

    // Confirm turning off overlap and remove conflicting subjects
    const handleConfirmDisableOverlap = () => {
        // First, create a list of non-conflicting groups to keep
        const groupsToKeep = [];
        const conflicts = new Set();

        // Function to check if a group conflicts with any group in groupsToKeep
        const hasConflict = (group) => {
            for (const existingGroup of groupsToKeep) {
                // Create slots for the new group
                const newSlots = [];

                // Add professor slots
                group.professor.horarios?.forEach(schedule => {
                    const [start, end] = parseTimeString(schedule.horario) || [null, null];
                    if (start === null || end === null) return;

                    (schedule.dias || []).forEach(day => {
                        newSlots.push({ day, start, end });
                    });
                });

                // Add assistant slots
                group.assistants?.forEach(assistant => {
                    if (!assistant.horario || !assistant.dias) return;
                    const [start, end] = parseTimeString(assistant.horario) || [null, null];
                    if (start === null || end === null) return;

                    assistant.dias.forEach(day => {
                        newSlots.push({ day, start, end });
                    });
                });

                // Create slots for the existing group
                const existingSlots = [];

                // Add professor slots
                existingGroup.professor.horarios?.forEach(schedule => {
                    const [start, end] = parseTimeString(schedule.horario) || [null, null];
                    if (start === null || end === null) return;

                    (schedule.dias || []).forEach(day => {
                        existingSlots.push({ day, start, end });
                    });
                });

                // Add assistant slots
                existingGroup.assistants?.forEach(assistant => {
                    if (!assistant.horario || !assistant.dias) return;
                    const [start, end] = parseTimeString(assistant.horario) || [null, null];
                    if (start === null || end === null) return;

                    assistant.dias.forEach(day => {
                        existingSlots.push({ day, start, end });
                    });
                });

                // Check for conflicts
                for (const newSlot of newSlots) {
                    for (const existingSlot of existingSlots) {
                        if (newSlot.day === existingSlot.day &&
                            hasTimeOverlap(newSlot.start, newSlot.end, existingSlot.start, existingSlot.end)) {
                            return true;
                        }
                    }
                }
            }
            return false;
        };

        // Process each group
        for (const group of selectedGroups) {
            if (hasConflict(group)) {
                conflicts.add(`${group.subject} (Grupo ${group.group})`);
            } else {
                groupsToKeep.push(group);
            }
        }

        // Update state
        setSelectedGroups(groupsToKeep);
        setAllowOverlap(false);
        setShowOverlapWarning(false);

        // Show alert with removed groups
        if (conflicts.size > 0) {
            const removedGroups = Array.from(conflicts).join(', ');
            setConflictAlert(`Se han eliminado las siguientes materias debido a traslapes: ${removedGroups}`);
        }
    };

    return (
        <MajorProvider>
            <div className="flex h-[100dvh] w-full overflow-hidden">
                {conflictAlert && (
                    <CustomAlert
                        message={conflictAlert}
                        onClose={() => setConflictAlert(null)}
                    />
                )}
                {showOverlapWarning && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                        <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-4 border border-gray-700 shadow-xl">
                            <h3 className="text-xl font-semibold text-red-400 mb-3">¡Atención!</h3>
                            <p className="text-gray-300 mb-4">
                                Tienes materias que se traslapan. Si desactivas esta opción tendrás que volver a elegirlas.
                            </p>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setShowOverlapWarning(false)}
                                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmDisableOverlap}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
                                >
                                    Continuar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <ResizablePanels
                    leftPanel={
                        <div className="flex flex-col h-full">
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <ScheduleSelector
                                    onGroupSelect={handleGroupSelect}
                                    selectedGroups={selectedGroups}
                                />
                            </div>
                            <OverlapToggle
                                checked={allowOverlap}
                                onChange={handleToggleOverlap}
                            />
                        </div>
                    }
                    centerPanel={
                        <div className="overflow-hidden" ref={scheduleRef}>
                            <ScheduleViewer
                                selectedGroups={selectedGroups}
                                onRemoveGroup={handleGroupSelect}
                                scheduleName={scheduleTitle}
                            />
                        </div>
                    }
                    rightPanel={
                        <SelectedGroupsPanel
                            selectedGroups={selectedGroups}
                            onRemoveGroup={handleGroupSelect}
                            onSaveSchedule={handleSaveSchedule}
                            setShowSavePopup={setShowSavePopup}
                            scheduleTitle={scheduleTitle}
                            onTitleChange={handleTitleChange}
                        />
                    }
                />

                <ExportLayout
                    ref={exportRef}
                    selectedGroups={selectedGroups}
                    schedule={
                        <ScheduleViewer
                            selectedGroups={selectedGroups}
                            scheduleName={scheduleTitle}
                            isExport={true}
                        />
                    }
                />
                {showSavePopup && (
                    <SavePopup onClose={() => setShowSavePopup(false)} />
                )}
            </div>
        </MajorProvider>
    );
};

export default Display;