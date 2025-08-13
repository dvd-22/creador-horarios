import React, { useState, useMemo } from 'react';
import { createEvents } from 'ics';
import { useMajorContext } from '../contexts/MajorContext';
import { Edit2 } from 'lucide-react';
import ProfessorRating from './ProfessorRating';

const GOOGLE_COLORS = {
    LAVENDER: 1,
    SAGE: 2,
    GRAPE: 3,
    FLAMINGO: 4,
    BANANA: 5,
    TANGERINE: 6,
    PEACOCK: 7,
    GRAPHITE: 8,
    BLUEBERRY: 9,
    BASIL: 10,
    TOMATO: 11
};

const parseTimeString = (timeStr) => {
    if (!timeStr || timeStr === 'Horario no especificado') return null;

    // Handle format "HH:MM a HH:MM"
    if (timeStr.includes('a')) {
        const [startTime, endTime] = timeStr.split('a').map(t => t.trim());
        return {
            start: timeToMinutes(startTime),
            end: timeToMinutes(endTime)
        };
    }

    // Handle format "HH:MM - HH:MM"
    if (timeStr.includes('-')) {
        const [startTime, endTime] = timeStr.split('-').map(t => t.trim());
        return {
            start: timeToMinutes(startTime),
            end: timeToMinutes(endTime)
        };
    }

    return null;
};

const timeToMinutes = (time) => {
    if (!time) return null;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const SelectedGroupsPanel = ({ selectedGroups, onRemoveGroup, onSaveSchedule, setShowSavePopup, scheduleTitle, onTitleChange, isMobile = false }) => {
    const { availableMajors } = useMajorContext();
    const [isNaming, setIsNaming] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [tempTitle, setTempTitle] = useState(scheduleTitle);

    const subjectColors = useMemo(() => {
        const uniqueSubjects = [...new Set(selectedGroups.map(group => group.subject))];
        return Object.fromEntries(
            uniqueSubjects.map((subject, index) => [
                subject,
                Object.values(GOOGLE_COLORS)[index % Object.keys(GOOGLE_COLORS).length]
            ])
        );
    }, [selectedGroups]);

    const handleSave = () => {
        onSaveSchedule(scheduleTitle);
    };

    const handleTitleEdit = () => {
        setTempTitle(scheduleTitle);
        setIsEditingTitle(true);
    };

    const handleTitleSave = () => {
        if (tempTitle.trim()) {
            onTitleChange(tempTitle.trim());
        }
        setIsEditingTitle(false);
    };

    const handleTitleCancel = () => {
        setTempTitle(scheduleTitle);
        setIsEditingTitle(false);
    };

    const handleTitleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleTitleSave();
        } else if (e.key === 'Escape') {
            handleTitleCancel();
        }
    };

    const handleExportICS = () => {
        const events = [];
        const dayOffsets = { Lu: 0, Ma: 1, Mi: 2, Ju: 3, Vi: 4, Sa: 5 };

        // Get the next Monday as the starting point
        const today = new Date();
        const nextMonday = new Date(today);
        const daysUntilMonday = (7 - today.getDay() + 1) % 7;
        nextMonday.setDate(today.getDate() + daysUntilMonday);

        selectedGroups.forEach((group, groupIndex) => {
            const color = subjectColors[group.subject];

            // Process professor schedules
            group.professor.horarios?.forEach(schedule => {
                const timeRange = parseTimeString(schedule.horario);
                if (timeRange && schedule.dias) {
                    schedule.dias.forEach(day => {
                        const dayOffset = dayOffsets[day];
                        if (dayOffset !== undefined) {
                            const eventDate = new Date(nextMonday);
                            eventDate.setDate(nextMonday.getDate() + dayOffset);

                            const startDateTime = new Date(eventDate);
                            const endDateTime = new Date(eventDate);

                            startDateTime.setHours(Math.floor(timeRange.start / 60), timeRange.start % 60);
                            endDateTime.setHours(Math.floor(timeRange.end / 60), timeRange.end % 60);

                            events.push({
                                title: `${group.subject} (${group.group})`,
                                description: `Profesor: ${group.professor.nombre}\nAyudantes: ${group.assistants?.map(a => a.nombre).join(', ') || 'N/A'}`,
                                start: [startDateTime.getFullYear(), startDateTime.getMonth() + 1, startDateTime.getDate(), startDateTime.getHours(), startDateTime.getMinutes()],
                                end: [endDateTime.getFullYear(), endDateTime.getMonth() + 1, endDateTime.getDate(), endDateTime.getHours(), endDateTime.getMinutes()],
                                location: group.salon || group.modalidad || '',
                                categories: [group.subject],
                                status: 'CONFIRMED',
                                busyStatus: 'BUSY',
                                organizer: { name: group.professor.nombre || 'Profesor' },
                                recurrenceRule: 'FREQ=WEEKLY;COUNT=16',
                                color: color
                            });
                        }
                    });
                }
            });

            // Process assistants schedules
            group.assistants?.forEach(assistant => {
                const timeRange = parseTimeString(assistant.horario);
                if (timeRange && assistant.dias) {
                    assistant.dias.forEach(day => {
                        const dayOffset = dayOffsets[day];
                        if (dayOffset !== undefined) {
                            const eventDate = new Date(nextMonday);
                            eventDate.setDate(nextMonday.getDate() + dayOffset);

                            const startDateTime = new Date(eventDate);
                            const endDateTime = new Date(eventDate);

                            startDateTime.setHours(Math.floor(timeRange.start / 60), timeRange.start % 60);
                            endDateTime.setHours(Math.floor(timeRange.end / 60), timeRange.end % 60);

                            events.push({
                                title: `${group.subject} (${group.group}) - Ayudantía`,
                                description: `Ayudante: ${assistant.nombre}`,
                                start: [startDateTime.getFullYear(), startDateTime.getMonth() + 1, startDateTime.getDate(), startDateTime.getHours(), startDateTime.getMinutes()],
                                end: [endDateTime.getFullYear(), endDateTime.getMonth() + 1, endDateTime.getDate(), endDateTime.getHours(), endDateTime.getMinutes()],
                                location: assistant.salon || '',
                                categories: [group.subject],
                                status: 'CONFIRMED',
                                busyStatus: 'BUSY',
                                organizer: { name: assistant.nombre || 'Ayudante' },
                                recurrenceRule: 'FREQ=WEEKLY;COUNT=16',
                                color: color
                            });
                        }
                    });
                }
            });
        });

        createEvents(events, (error, value) => {
            if (error) {
                console.error('Error creating ICS file:', error);
                return;
            }

            const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.setAttribute('download', `${scheduleTitle || 'horario'}.ics`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        });
    };

    if (isMobile) {
        // Mobile horizontal layout
        return (
            <div className="flex items-center space-x-3 overflow-x-auto">
                {/* Schedule Title */}
                <div className="flex-shrink-0 flex items-center">
                    {isEditingTitle ? (
                        <input
                            type="text"
                            value={tempTitle}
                            onChange={(e) => setTempTitle(e.target.value)}
                            onBlur={handleTitleSave}
                            onKeyDown={handleTitleKeyPress}
                            className="bg-gray-800 text-white px-2 py-1 rounded text-sm w-32 border border-gray-600 focus:border-blue-500 outline-none"
                            autoFocus
                        />
                    ) : (
                        <div className="flex items-center">
                            <span className="text-white font-medium text-sm truncate max-w-32">
                                {scheduleTitle}
                            </span>
                            <button
                                onClick={handleTitleEdit}
                                className="ml-1 text-gray-400 hover:text-white p-1"
                            >
                                <Edit2 size={12} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Selected Groups Chips */}
                <div className="flex items-center space-x-2 overflow-x-auto flex-1">
                    {selectedGroups.map((group, index) => (
                        <div
                            key={`${group.semester}-${group.subject}-${group.group}`}
                            className="flex-shrink-0 bg-gray-800 border border-gray-600 rounded-lg px-3 py-1 flex items-center space-x-2"
                        >
                            <div className="text-xs">
                                <span className="text-white font-medium">{group.subject}</span>
                                <span className="text-gray-400 ml-1">({group.group})</span>
                            </div>
                            <button
                                onClick={() => onRemoveGroup(group.semester, group.subject, group.group, {
                                    profesor: group.professor,
                                    ayudantes: group.assistants
                                })}
                                className="text-red-400 hover:text-red-300 text-xs h-4 w-4 flex items-center justify-center"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>

                {/* Action Buttons */}
                <div className="flex-shrink-0 flex items-center space-x-2">
                    <button
                        onClick={handleSave}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                    >
                        Guardar
                    </button>
                    <button
                        onClick={handleExportICS}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
                    >
                        .ics
                    </button>
                </div>
            </div>
        );
    }

    // Desktop vertical layout (existing code)
    return (
        <div className="h-full flex flex-col bg-gray-900 text-white">
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center flex-1">
                        {isEditingTitle ? (
                            <input
                                type="text"
                                value={tempTitle}
                                onChange={(e) => setTempTitle(e.target.value)}
                                onBlur={handleTitleSave}
                                onKeyDown={handleTitleKeyPress}
                                className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 outline-none flex-1"
                                autoFocus
                            />
                        ) : (
                            <div className="flex items-center flex-1">
                                <h2 className="text-lg font-semibold text-white truncate">
                                    {scheduleTitle}
                                </h2>
                                <button
                                    onClick={handleTitleEdit}
                                    className="ml-2 text-gray-400 hover:text-white p-1 rounded"
                                >
                                    <Edit2 size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex space-x-2">
                    <button
                        onClick={handleSave}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm font-medium transition-colors"
                    >
                        💾 Guardar como PNG
                    </button>
                    <button
                        onClick={handleExportICS}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded text-sm font-medium transition-colors"
                    >
                        📅 Exportar .ics
                    </button>
                </div>
            </div>

            {/* Selected Groups List */}
            <div className="flex-1 p-4 overflow-y-auto">
                <h3 className="font-medium text-gray-300 mb-3">
                    Materias seleccionadas ({selectedGroups.length})
                </h3>
                {selectedGroups.map((group, index) => {
                    const majorInfo = availableMajors.find(m => m.code === group.semester);

                    return (
                        <div key={`${group.semester}-${group.subject}-${group.group}`} className="mb-3 bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors">
                            {/* Header with subject name and remove button */}
                            <div className="bg-gray-800 px-3 py-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-white text-sm mb-1 break-words">
                                            {group.subject}
                                        </div>
                                        <div className="text-xs text-gray-400 flex flex-wrap items-center gap-2">
                                            <span className="bg-gray-700 px-2 py-1 rounded">Grupo {group.group}</span>
                                            {majorInfo && (
                                                <span className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded">
                                                    {majorInfo.name}
                                                </span>
                                            )}
                                            {group.professor.nombre && (
                                                <span className="text-gray-400">• {group.professor.nombre}</span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onRemoveGroup(group.semester, group.subject, group.group, {
                                            profesor: group.professor,
                                            ayudantes: group.assistants
                                        })}
                                        className="text-red-400 hover:text-red-300 text-xs h-5 w-5 flex items-center justify-center rounded-full hover:bg-gray-700 ml-2"
                                        aria-label="Eliminar materia"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {/* Classroom/Modality/Rating section */}
                            {(group.salon || group.modalidad || group.professor.nombre) && (
                                <div className="px-3 py-2 text-xs flex items-center justify-between text-gray-300">
                                    <div className="flex items-center">
                                        {group.salon ? (
                                            // If classroom is available, show only the classroom
                                            <>
                                                <span className="mr-1">🏫</span>
                                                <span>{group.salon}</span>
                                            </>
                                        ) : group.modalidad ? (
                                            // If no classroom but modality exists, show modality
                                            <>
                                                <span className="mr-1">{group.modalidad === "Presencial" ? "👨‍🏫" : "💻"}</span>
                                                <span>{group.modalidad}</span>
                                            </>
                                        ) : null}
                                    </div>
                                    {group.professor.nombre && (
                                        <ProfessorRating
                                            professorName={group.professor.nombre}
                                            className="text-xs"
                                        />
                                    )}
                                </div>
                            )}

                            {/* Presentation button section */}
                            {group.presentacion && (
                                <div className="px-3 pb-3">
                                    <button
                                        onClick={() => window.open(group.presentacion, '_blank', 'noopener,noreferrer')}
                                        className="inline-flex items-center px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                                    >
                                        <span className="mr-1">📄</span>
                                        Presentación
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
                {selectedGroups.length === 0 && (
                    <p className="text-gray-500 text-center text-sm italic">
                        Aún no has seleccionado materias
                    </p>
                )}
            </div>

            <div className="mt-4 text-center text-sm text-gray-400 px-4 pb-4">
                Con ♥️ por Dvd22 - {' '}
                <a
                    href="https://github.com/dvd-22/creador-horarios"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                >
                    Contribuye
                </a>
            </div>
        </div>
    );
};

export default SelectedGroupsPanel;
