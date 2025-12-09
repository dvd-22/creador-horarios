import React, { useState, useEffect, useRef } from 'react';
import ScheduleSelector from './ScheduleSelector';
import ExportLayout from './ExportLayout';
import ScheduleViewer from './ScheduleViewer';
import SelectedGroupsPanel from './SelectedGroupsPanel';
import ResizablePanels from './ResizablePanels';
import ResponsiveDisplay from './ResponsiveDisplay';
import SpacerModal from './SpacerModal';
import { saveScheduleAsPng } from '../utils/scheduleUtils';
import SavePopup from './SavePopup';
import { MajorProvider } from '../contexts/MajorContext';
import { encodeScheduleToURL, decodeScheduleFromURL } from '../utils/urlEncoder';

// Function to load full group data from JSON files
const loadGroupData = async (majorId, studyPlanId, groupId) => {
    try {
        let dataModule;

        // Map majorId to data file
        const majorDataMap = {
            'cs': () => import('../data/ciencias-computacion.json'),
            'math': () => import('../data/matematicas.json'),
            'physics': () => import('../data/fisica.json'),
            'ap-math': () => import('../data/matematicas-aplicadas.json'),
            'actuary': () => import('../data/actuaria.json'),
            'bio-physics': () => import('../data/fisica-biomedica.json'),
            'biology-1997': () => import('../data/biologia-1997.json'),
            'biology-2025': () => import('../data/biologia-2025.json'),
        };

        // Handle biology with study plans
        let dataKey = majorId;
        if (majorId === 'biology' && studyPlanId) {
            dataKey = `biology-${studyPlanId}`;
        }

        const dataLoader = majorDataMap[dataKey];
        if (!dataLoader) {
            console.error(`No data loader found for ${dataKey}`);
            return null;
        }

        dataModule = await dataLoader();
        const data = dataModule.default;

        // Search for the group across all semesters
        for (const semester of Object.keys(data)) {
            const semesterData = data[semester];
            for (const subject of Object.keys(semesterData)) {
                const subjectData = semesterData[subject];
                // Groups are directly under the subject, not under a 'grupos' key
                if (subjectData[groupId]) {
                    const groupData = subjectData[groupId];
                    return {
                        semester,
                        subject,
                        group: groupId,
                        professor: {
                            ...groupData.profesor,
                            horarios: groupData.profesor.horarios || []
                        },
                        assistants: groupData.ayudantes || [],
                        salon: groupData.salon || null,
                        modalidad: groupData.modalidad || null,
                        presentacion: groupData.presentacion || null,
                        majorId,
                        studyPlanId
                    };
                }
            }
        }

        console.warn(`Group ${groupId} not found in ${dataKey}`);
        return null;
    } catch (error) {
        console.error(`Error loading group data for ${majorId}/${groupId}:`, error);
        return null;
    }
};

const CustomAlert = ({ message, onClose }) => (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] w-[90%] max-w-md bg-red-900/80 border border-red-500 text-white px-5 py-4 rounded-lg shadow-xl backdrop-blur-sm">
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
    // Load selectedGroups from localStorage on initialization
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [spacers, setSpacers] = useState(() => {
        // First, try to load from URL hash
        const hash = window.location.hash.substring(1);
        if (hash) {
            try {
                const scheduleData = decodeScheduleFromURL(hash);
                if (scheduleData && scheduleData.spacers && Array.isArray(scheduleData.spacers)) {
                    return scheduleData.spacers;
                }
                // If URL exists but has no spacers, return empty array (don't use localStorage)
                return [];
            } catch (error) {
                console.warn('Failed to load spacers from URL:', error);
            }
        }

        // Only use localStorage if there's no URL hash
        try {
            const saved = localStorage.getItem('spacers');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [isLoadingFromURL, setIsLoadingFromURL] = useState(false);
    const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
    const [conflictAlert, setConflictAlert] = useState(null);
    const [scheduleTitle, setScheduleTitle] = useState(() => {
        // First, try to load from URL hash
        const hash = window.location.hash.substring(1);
        if (hash) {
            try {
                const scheduleData = decodeScheduleFromURL(hash);
                if (scheduleData && scheduleData.title) {
                    return scheduleData.title;
                }
            } catch (error) {
                console.warn('Failed to load title from URL:', error);
            }
        }

        // Fallback to localStorage
        try {
            const savedTitle = localStorage.getItem('scheduleTitle');
            return savedTitle || 'Mi horario';
        } catch (error) {
            console.warn('Failed to load schedule title from localStorage:', error);
            return 'Mi horario';
        }
    });
    const [showSavePopup, setShowSavePopup] = useState(false);
    const [savePopupMessage, setSavePopupMessage] = useState('');
    const [allowOverlap, setAllowOverlap] = useState(() => {
        // First, try to load from URL hash
        const hash = window.location.hash.substring(1);
        if (hash) {
            try {
                const scheduleData = decodeScheduleFromURL(hash);
                if (scheduleData && scheduleData.allowOverlap !== undefined) {
                    return scheduleData.allowOverlap;
                }
            } catch (error) {
                console.warn('Failed to load allowOverlap from URL:', error);
            }
        }
        return false;
    });
    const [showOverlapWarning, setShowOverlapWarning] = useState(false);
    const [editingSpacerId, setEditingSpacerId] = useState(null);
    const [isSpacerModalOpen, setIsSpacerModalOpen] = useState(false);
    const scheduleRef = useRef(null);
    const exportRef = useRef(null);
    const revealGroupRef = useRef(null);
    const openMobileMenuRef = useRef(null);
    const uncollapseLeftPanelRef = useRef(null);

    // Load groups from URL on mount
    useEffect(() => {
        const loadFromURL = async () => {
            const hash = window.location.hash.substring(1);
            if (hash) {
                setIsLoadingFromURL(true);
                try {
                    const scheduleData = decodeScheduleFromURL(hash);
                    if (scheduleData && scheduleData.groups && Array.isArray(scheduleData.groups)) {
                        // Load full group data for each minimal group
                        const fullGroups = await Promise.all(
                            scheduleData.groups.map(minimalGroup =>
                                loadGroupData(minimalGroup.majorId, minimalGroup.studyPlanId, minimalGroup.group)
                            )
                        );
                        // Filter out any null results (groups that couldn't be loaded)
                        const validGroups = fullGroups.filter(g => g !== null);
                        setSelectedGroups(validGroups);

                        // Load spacers from URL
                        if (scheduleData.spacers && Array.isArray(scheduleData.spacers)) {
                            setSpacers(scheduleData.spacers);
                            localStorage.setItem('spacers', JSON.stringify(scheduleData.spacers));
                        }

                        setHasInitiallyLoaded(true);
                    }
                } catch (error) {
                    console.warn('Failed to load schedule from URL:', error);
                    // Fallback to localStorage
                    try {
                        const savedGroups = localStorage.getItem('lastSchedule');
                        if (savedGroups) {
                            setSelectedGroups(JSON.parse(savedGroups));
                        }
                    } catch (e) {
                        console.warn('Failed to load from localStorage:', e);
                    }
                    setHasInitiallyLoaded(true);
                } finally {
                    setIsLoadingFromURL(false);
                }
            } else {
                // No URL hash, load from localStorage
                try {
                    const savedGroups = localStorage.getItem('lastSchedule');
                    if (savedGroups) {
                        setSelectedGroups(JSON.parse(savedGroups));
                    }
                } catch (error) {
                    console.warn('Failed to load from localStorage:', error);
                }
                setHasInitiallyLoaded(true);
            }
        };

        loadFromURL();
    }, []); // Only run on mount

    // Auto-save selectedGroups to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem('lastSchedule', JSON.stringify(selectedGroups));
        } catch (error) {
            console.warn('Failed to save schedule to localStorage:', error);
        }
    }, [selectedGroups]);

    // Auto-save scheduleTitle to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem('scheduleTitle', scheduleTitle);
        } catch (error) {
            console.warn('Failed to save schedule title to localStorage:', error);
        }
    }, [scheduleTitle]);

    // Update URL hash whenever schedule changes
    useEffect(() => {
        // Don't update URL while loading from URL or before initial load is complete
        if (isLoadingFromURL || !hasInitiallyLoaded) return;

        if (selectedGroups.length > 0 || spacers.length > 0) {
            try {
                const scheduleData = {
                    groups: selectedGroups,
                    spacers: spacers,
                    title: scheduleTitle,
                    allowOverlap: allowOverlap
                };
                const encodedData = encodeScheduleToURL(scheduleData);
                window.history.replaceState(null, '', `#${encodedData}`);
            } catch (error) {
                console.warn('Failed to update URL:', error);
            }
        } else {
            // Clear hash if no groups selected
            window.history.replaceState(null, '', window.location.pathname);
        }
    }, [selectedGroups, spacers, scheduleTitle, allowOverlap, isLoadingFromURL, hasInitiallyLoaded]);

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

        // Check against spacers
        const dayMap = {
            'L': 'Lu',
            'M': 'Ma',
            'I': 'Mi',
            'J': 'Ju',
            'V': 'Vi',
            'S': 'Sa'
        };

        for (const spacer of spacers) {
            const spacerStart = timeToMinutes(spacer.startTime);
            const spacerEnd = timeToMinutes(spacer.endTime);

            for (const newSlot of newSlots) {
                for (const spacerDayId of spacer.days) {
                    const spacerDay = dayMap[spacerDayId];
                    if (newSlot.day === spacerDay &&
                        hasTimeOverlap(newSlot.start, newSlot.end, spacerStart, spacerEnd)) {
                        return {
                            conflictWith: { subject: spacer.name, group: '(Horario Personal)' },
                            day: newSlot.day,
                            newTime: `${Math.floor(newSlot.start / 60)}:${String(newSlot.start % 60).padStart(2, '0')} - ${Math.floor(newSlot.end / 60)}:${String(newSlot.end % 60).padStart(2, '0')}`,
                            existingTime: spacer.startTime + ' - ' + spacer.endTime
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
                            groupId: `${group.subject}-${group.group}`, // Unique identifier for the group
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
                            groupId: `${group.subject}-${group.group}`, // Same identifier for professor and assistants
                            group: `${group.subject} (${group.group}) - Ayudantía`
                        });
                    });
                }
            });
        }

        // Check for overlaps between DIFFERENT groups only
        for (let i = 0; i < allSlots.length; i++) {
            for (let j = i + 1; j < allSlots.length; j++) {
                const slotA = allSlots[i];
                const slotB = allSlots[j];

                // Only check overlaps between different groups
                if (slotA.groupId !== slotB.groupId &&
                    slotA.day === slotB.day &&
                    hasTimeOverlap(slotA.start, slotA.end, slotB.start, slotB.end)) {
                    return true;
                }
            }
        }

        // Check for overlaps between groups and spacers
        const dayMap = {
            'L': 'Lu',
            'M': 'Ma',
            'I': 'Mi',
            'J': 'Ju',
            'V': 'Vi',
            'S': 'Sa'
        };

        for (const spacer of spacers) {
            const spacerStart = timeToMinutes(spacer.startTime);
            const spacerEnd = timeToMinutes(spacer.endTime);

            for (const slot of allSlots) {
                for (const spacerDayId of spacer.days) {
                    const spacerDay = dayMap[spacerDayId];
                    if (slot.day === spacerDay &&
                        hasTimeOverlap(slot.start, slot.end, spacerStart, spacerEnd)) {
                        return true;
                    }
                }
            }
        }

        // Check for overlaps between spacers
        for (let i = 0; i < spacers.length; i++) {
            for (let j = i + 1; j < spacers.length; j++) {
                const spacerA = spacers[i];
                const spacerB = spacers[j];

                const startA = timeToMinutes(spacerA.startTime);
                const endA = timeToMinutes(spacerA.endTime);
                const startB = timeToMinutes(spacerB.startTime);
                const endB = timeToMinutes(spacerB.endTime);

                for (const dayA of spacerA.days) {
                    for (const dayB of spacerB.days) {
                        if (dayA === dayB && hasTimeOverlap(startA, endA, startB, endB)) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    };

    // Handle group selection
    const handleGroupSelect = (semester, subject, group, groupData, majorId = 'cs', studyPlanId = null) => {
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

        // Add majorId, studyPlanId, and presentacion to the new group object
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
            majorId, // Store the majorId (could be composite like "biology-1997")
            studyPlanId // Store the study plan separately if applicable
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

    const handleSpacerSave = (spacer) => {
        // Check for conflicts if overlap is not allowed
        if (!allowOverlap) {
            const conflict = checkSpacerConflicts(spacer);
            if (conflict) {
                // Don't close modal, show error through the modal
                return conflict;
            }
        }

        setSpacers(prev => {
            const existingIndex = prev.findIndex(s => s.id === spacer.id);
            let updated;
            if (existingIndex >= 0) {
                // Update existing spacer
                updated = [...prev];
                updated[existingIndex] = spacer;
            } else {
                // Add new spacer
                updated = [...prev, spacer];
            }
            // Save to localStorage
            localStorage.setItem('spacers', JSON.stringify(updated));
            return updated;
        });
        return null; // No conflict
    };

    const checkSpacerConflicts = (newSpacer) => {
        const dayMap = {
            'L': 'Lu',
            'M': 'Ma',
            'I': 'Mi',
            'J': 'Ju',
            'V': 'Vi',
            'S': 'Sa'
        };

        const spacerStart = timeToMinutes(newSpacer.startTime);
        const spacerEnd = timeToMinutes(newSpacer.endTime);

        // Check against all selected groups
        for (const group of selectedGroups) {
            // Check professor schedules
            for (const schedule of (group.professor.horarios || [])) {
                const [profStart, profEnd] = parseTimeString(schedule.horario);
                const profDays = schedule.dias || [];

                if (profStart !== null && profEnd !== null) {
                    for (const scheduleDay of profDays) {
                        for (const spacerDayId of newSpacer.days) {
                            const spacerDay = dayMap[spacerDayId];
                            if (spacerDay === scheduleDay && hasTimeOverlap(spacerStart, spacerEnd, profStart, profEnd)) {
                                return `El espacio "${newSpacer.name}" se superpone con ${group.subject} (${group.group}) el día ${scheduleDay}`;
                            }
                        }
                    }
                }
            }

            // Check assistant schedules
            for (const assistant of (group.assistants || [])) {
                if (!assistant.horario || !assistant.dias) continue;

                const [astStart, astEnd] = parseTimeString(assistant.horario);
                const assistantDays = assistant.dias || [];

                if (astStart !== null && astEnd !== null) {
                    for (const scheduleDay of assistantDays) {
                        for (const spacerDayId of newSpacer.days) {
                            const spacerDay = dayMap[spacerDayId];
                            if (spacerDay === scheduleDay && hasTimeOverlap(spacerStart, spacerEnd, astStart, astEnd)) {
                                return `El espacio "${newSpacer.name}" se superpone con ${group.subject} (${group.group}) - Ayudantía el día ${scheduleDay}`;
                            }
                        }
                    }
                }
            }
        }

        // Check against other spacers (excluding itself if editing)
        for (const existingSpacer of spacers) {
            if (existingSpacer.id === newSpacer.id) continue; // Skip self when editing

            const existingStart = timeToMinutes(existingSpacer.startTime);
            const existingEnd = timeToMinutes(existingSpacer.endTime);

            for (const existingDayId of existingSpacer.days) {
                for (const newDayId of newSpacer.days) {
                    if (existingDayId === newDayId && hasTimeOverlap(spacerStart, spacerEnd, existingStart, existingEnd)) {
                        const dayMap2 = {
                            'L': 'Lunes',
                            'M': 'Martes',
                            'I': 'Miércoles',
                            'J': 'Jueves',
                            'V': 'Viernes',
                            'S': 'Sábado'
                        };
                        return `El espacio "${newSpacer.name}" se superpone con otro espacio "${existingSpacer.name}" el día ${dayMap2[existingDayId]}`;
                    }
                }
            }
        }

        return null; // No conflicts
    };

    const handleSpacerDelete = (spacerId) => {
        setSpacers(prev => {
            const updated = prev.filter(s => s.id !== spacerId);
            localStorage.setItem('spacers', JSON.stringify(updated));
            return updated;
        });
    };

    const handleEditSpacer = (spacerId) => {
        setEditingSpacerId(spacerId);
        setIsSpacerModalOpen(true);
    };

    const handleSpacerModalSave = (spacer) => {
        const error = handleSpacerSave(spacer);
        if (!error) {
            setEditingSpacerId(null);
        }
        return error;
    };

    const handleSpacerModalClose = () => {
        setEditingSpacerId(null);
        setIsSpacerModalOpen(false);
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
        const spacersToKeep = [];
        const conflicts = new Set();

        const dayMap = {
            'L': 'Lu',
            'M': 'Ma',
            'I': 'Mi',
            'J': 'Ju',
            'V': 'Vi',
            'S': 'Sa'
        };

        // Function to check if a group conflicts with any group in groupsToKeep or spacersToKeep
        const hasConflict = (group) => {
            // Check against kept groups
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

            // Check against kept spacers
            for (const spacer of spacersToKeep) {
                const spacerStart = timeToMinutes(spacer.startTime);
                const spacerEnd = timeToMinutes(spacer.endTime);

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

                // Check for conflicts
                for (const slot of newSlots) {
                    for (const spacerDayId of spacer.days) {
                        const spacerDay = dayMap[spacerDayId];
                        if (slot.day === spacerDay &&
                            hasTimeOverlap(slot.start, slot.end, spacerStart, spacerEnd)) {
                            return true;
                        }
                    }
                }
            }

            return false;
        };

        // Function to check if a spacer conflicts with kept groups or spacers
        const spacerHasConflict = (spacer) => {
            const spacerStart = timeToMinutes(spacer.startTime);
            const spacerEnd = timeToMinutes(spacer.endTime);

            // Check against kept groups
            for (const group of groupsToKeep) {
                // Check professor schedules
                for (const schedule of (group.professor.horarios || [])) {
                    const [start, end] = parseTimeString(schedule.horario);
                    const days = schedule.dias || [];

                    if (start !== null && end !== null) {
                        for (const scheduleDay of days) {
                            for (const spacerDayId of spacer.days) {
                                const spacerDay = dayMap[spacerDayId];
                                if (spacerDay === scheduleDay && hasTimeOverlap(spacerStart, spacerEnd, start, end)) {
                                    return true;
                                }
                            }
                        }
                    }
                }

                // Check assistant schedules
                for (const assistant of (group.assistants || [])) {
                    if (!assistant.horario || !assistant.dias) continue;
                    const [start, end] = parseTimeString(assistant.horario);
                    const days = assistant.dias || [];

                    if (start !== null && end !== null) {
                        for (const scheduleDay of days) {
                            for (const spacerDayId of spacer.days) {
                                const spacerDay = dayMap[spacerDayId];
                                if (spacerDay === scheduleDay && hasTimeOverlap(spacerStart, spacerEnd, start, end)) {
                                    return true;
                                }
                            }
                        }
                    }
                }
            }

            // Check against kept spacers
            for (const existingSpacer of spacersToKeep) {
                const existingStart = timeToMinutes(existingSpacer.startTime);
                const existingEnd = timeToMinutes(existingSpacer.endTime);

                for (const dayA of spacer.days) {
                    for (const dayB of existingSpacer.days) {
                        if (dayA === dayB && hasTimeOverlap(spacerStart, spacerEnd, existingStart, existingEnd)) {
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

        // Process each spacer
        for (const spacer of spacers) {
            if (spacerHasConflict(spacer)) {
                conflicts.add(`${spacer.name} (Horario Personal)`);
            } else {
                spacersToKeep.push(spacer);
            }
        }

        // Update state
        setSelectedGroups(groupsToKeep);
        setSpacers(spacersToKeep);
        localStorage.setItem('spacers', JSON.stringify(spacersToKeep));
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
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
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

                <ResponsiveDisplay
                    scheduleSelectorPanel={
                        <ScheduleSelector
                            onGroupSelect={handleGroupSelect}
                            selectedGroups={selectedGroups}
                            onSpacerSave={handleSpacerSave}
                            onRevealGroup={(fn) => {
                                revealGroupRef.current = (majorId, studyPlanId, semester, subject, group) => {
                                    // Uncollapse left panel if collapsed (desktop only)
                                    let wasCollapsed = false;
                                    if (uncollapseLeftPanelRef.current) {
                                        wasCollapsed = uncollapseLeftPanelRef.current();
                                    }

                                    if (wasCollapsed) {
                                        // Wait for panel to expand before revealing
                                        setTimeout(() => {
                                            fn(majorId, studyPlanId, semester, subject, group);
                                        }, 200);
                                    } else {
                                        // Panel already expanded, reveal immediately
                                        fn(majorId, studyPlanId, semester, subject, group);
                                    }
                                };
                            }}
                        />
                    }
                    scheduleViewerPanel={
                        <ScheduleViewer
                            selectedGroups={selectedGroups}
                            spacers={spacers}
                            onRemoveGroup={handleGroupSelect}
                            onEditSpacer={handleEditSpacer}
                            scheduleName={scheduleTitle}
                            onRevealGroup={(majorId, studyPlanId, semester, subject, group) => {
                                // Open mobile menu if on mobile
                                if (openMobileMenuRef.current) {
                                    openMobileMenuRef.current();
                                    // Wait for menu to open before scrolling
                                    setTimeout(() => {
                                        if (revealGroupRef.current) {
                                            revealGroupRef.current(majorId, studyPlanId, semester, subject, group);
                                        }
                                    }, 300);
                                } else {
                                    // Desktop - reveal immediately
                                    if (revealGroupRef.current) {
                                        revealGroupRef.current(majorId, studyPlanId, semester, subject, group);
                                    }
                                }
                            }}
                        />
                    }
                    selectedGroupsPanel={
                        <SelectedGroupsPanel
                            selectedGroups={selectedGroups}
                            spacers={spacers}
                            onRemoveGroup={handleGroupSelect}
                            onSaveSchedule={handleSaveSchedule}
                            setShowSavePopup={setShowSavePopup}
                            scheduleTitle={scheduleTitle}
                            onTitleChange={handleTitleChange}
                            onRevealGroup={(majorId, studyPlanId, semester, subject, group) => {
                                // Open mobile menu if on mobile
                                if (openMobileMenuRef.current) {
                                    openMobileMenuRef.current();
                                    // Wait for menu to open before scrolling
                                    setTimeout(() => {
                                        if (revealGroupRef.current) {
                                            revealGroupRef.current(majorId, studyPlanId, semester, subject, group);
                                        }
                                    }, 300);
                                } else {
                                    // Desktop - reveal immediately
                                    if (revealGroupRef.current) {
                                        revealGroupRef.current(majorId, studyPlanId, semester, subject, group);
                                    }
                                }
                            }}
                        />
                    }
                    overlapTogglePanel={
                        <OverlapToggle
                            checked={allowOverlap}
                            onChange={handleToggleOverlap}
                        />
                    }
                    scheduleRef={scheduleRef}
                    onOpenMobileMenu={(fn) => { openMobileMenuRef.current = fn; }}
                    onUncollapseLeftPanel={(fn) => { uncollapseLeftPanelRef.current = fn; }}
                />

                <ExportLayout
                    ref={exportRef}
                    selectedGroups={selectedGroups}
                    spacers={spacers}
                    schedule={
                        <ScheduleViewer
                            selectedGroups={selectedGroups}
                            spacers={spacers}
                            scheduleName={scheduleTitle}
                            isExport={true}
                        />
                    }
                />

                {/* Spacer Modal for editing from schedule */}
                <SpacerModal
                    isOpen={isSpacerModalOpen}
                    onClose={handleSpacerModalClose}
                    onSave={handleSpacerModalSave}
                    onDelete={handleSpacerDelete}
                    editingSpacer={editingSpacerId ? spacers.find(s => s.id === editingSpacerId) : null}
                />

                {showSavePopup && (
                    <SavePopup onClose={() => setShowSavePopup(false)} />
                )}
            </div>
        </MajorProvider>
    );
};

export default Display;