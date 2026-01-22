import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Plus } from 'lucide-react';

const HOURS = [
    '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
    '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
];

const DAYS = [
    { id: 'L', label: 'Lun', full: 'Lunes' },
    { id: 'M', label: 'Mar', full: 'Martes' },
    { id: 'I', label: 'Mié', full: 'Miércoles' },
    { id: 'J', label: 'Jue', full: 'Jueves' },
    { id: 'V', label: 'Vie', full: 'Viernes' },
    { id: 'S', label: 'Sáb', full: 'Sábado' }
];

const COLORS = [
    { id: 'bg-blue-700/50', label: 'Azul', hex: '#1d4ed8' },
    { id: 'bg-purple-700/50', label: 'Morado', hex: '#7c3aed' },
    { id: 'bg-green-700/50', label: 'Verde', hex: '#15803d' },
    { id: 'bg-red-700/50', label: 'Rojo', hex: '#b91c1c' },
    { id: 'bg-yellow-700/50', label: 'Amarillo', hex: '#a16207' },
    { id: 'bg-indigo-700/50', label: 'Índigo', hex: '#4338ca' },
    { id: 'bg-pink-700/50', label: 'Rosa', hex: '#be185d' },
    { id: 'bg-cyan-700/50', label: 'Cian', hex: '#0e7490' },
    { id: 'bg-teal-700/50', label: 'Verde azulado', hex: '#0f766e' },
    { id: 'bg-orange-700/50', label: 'Naranja', hex: '#c2410c' }
];

const SpacerModal = ({ isOpen, onClose, onSave, onDelete, editingSpacer = null }) => {
    const [name, setName] = useState('');
    const [schedules, setSchedules] = useState([{
        id: 0,
        days: ['L', 'M', 'I', 'J', 'V', 'S'],
        startIndex: 0,
        endIndex: 2,
        location: ''
    }]);
    const [selectedColor, setSelectedColor] = useState('bg-blue-700/50');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Clear error when opening
            setError('');

            if (editingSpacer) {
                setName(editingSpacer.name || '');
                setSelectedColor(editingSpacer.color || 'bg-blue-700/50');

                // Handle both old (single schedule) and new (multiple schedules) format
                if (editingSpacer.schedules && Array.isArray(editingSpacer.schedules)) {
                    // New format with multiple schedules
                    setSchedules(editingSpacer.schedules.map((sched, index) => ({
                        id: index,
                        days: sched.days || [],
                        startIndex: HOURS.indexOf(sched.startTime) !== -1 ? HOURS.indexOf(sched.startTime) : 0,
                        endIndex: HOURS.indexOf(sched.endTime) !== -1 ? HOURS.indexOf(sched.endTime) : 2,
                        location: sched.location || ''
                    })));
                } else {
                    // Old format - convert to new format
                    const startIdx = editingSpacer.startTime ? HOURS.indexOf(editingSpacer.startTime) : 0;
                    const endIdx = editingSpacer.endTime ? HOURS.indexOf(editingSpacer.endTime) : 2;
                    setSchedules([{
                        id: 0,
                        days: editingSpacer.days || ['L', 'M', 'I', 'J', 'V', 'S'],
                        startIndex: startIdx !== -1 ? startIdx : 0,
                        endIndex: endIdx !== -1 ? endIdx : 2,
                        location: editingSpacer.location || ''
                    }]);
                }
            } else {
                // Reset for new spacer
                setName('');
                setSchedules([{
                    id: 0,
                    days: ['L', 'M', 'I', 'J', 'V', 'S'],
                    startIndex: 0,
                    endIndex: 2,
                    location: ''
                }]);
                setSelectedColor('bg-blue-700/50');
            }
        }
    }, [isOpen, editingSpacer]);

    const handleStartChange = (scheduleId, e) => {
        const newStart = parseInt(e.target.value);
        setSchedules(prev => prev.map(sched => {
            if (sched.id === scheduleId) {
                const minGap = 1; // Minimum 30 minutes
                const maxAllowedStart = sched.endIndex - minGap;
                const adjustedStart = newStart <= maxAllowedStart ? newStart : maxAllowedStart;
                return { ...sched, startIndex: adjustedStart };
            }
            return sched;
        }));
    };

    const handleEndChange = (scheduleId, e) => {
        const newEnd = parseInt(e.target.value);
        setSchedules(prev => prev.map(sched => {
            if (sched.id === scheduleId) {
                const minGap = 1; // Minimum 30 minutes
                const minAllowedEnd = sched.startIndex + minGap;
                const adjustedEnd = newEnd >= minAllowedEnd ? newEnd : minAllowedEnd;
                return { ...sched, endIndex: adjustedEnd };
            }
            return sched;
        }));
    };

    const toggleDay = (scheduleId, dayId) => {
        setSchedules(prev => prev.map(sched => {
            if (sched.id === scheduleId) {
                const newDays = sched.days.includes(dayId)
                    ? sched.days.length === 1 ? sched.days : sched.days.filter(d => d !== dayId)
                    : [...sched.days, dayId].sort((a, b) => {
                        const order = ['L', 'M', 'I', 'J', 'V', 'S'];
                        return order.indexOf(a) - order.indexOf(b);
                    });
                return { ...sched, days: newDays };
            }
            return sched;
        }));
    };

    const updateLocation = (scheduleId, location) => {
        setSchedules(prev => prev.map(sched => {
            if (sched.id === scheduleId) {
                return { ...sched, location };
            }
            return sched;
        }));
    };

    const addSchedule = () => {
        const newId = Math.max(...schedules.map(s => s.id), 0) + 1;
        setSchedules(prev => [...prev, {
            id: newId,
            days: ['L'],
            startIndex: 0,
            endIndex: 2,
            location: ''
        }]);
    };

    const removeSchedule = (scheduleId) => {
        if (schedules.length === 1) return; // Don't allow removing the last schedule
        setSchedules(prev => prev.filter(s => s.id !== scheduleId));
    };

    // Helper to check if schedules conflict with each other
    const timeToMinutes = (time) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const hasTimeOverlap = (start1, end1, start2, end2) => {
        return start1 < end2 && start2 < end1;
    };

    const checkInternalConflicts = () => {
        // Check if any schedules within this spacer conflict with each other
        for (let i = 0; i < schedules.length; i++) {
            for (let j = i + 1; j < schedules.length; j++) {
                const schedA = schedules[i];
                const schedB = schedules[j];

                const startA = timeToMinutes(HOURS[schedA.startIndex]);
                const endA = timeToMinutes(HOURS[schedA.endIndex]);
                const startB = timeToMinutes(HOURS[schedB.startIndex]);
                const endB = timeToMinutes(HOURS[schedB.endIndex]);

                // Check if they share any days
                for (const dayA of schedA.days) {
                    for (const dayB of schedB.days) {
                        if (dayA === dayB && hasTimeOverlap(startA, endA, startB, endB)) {
                            const dayMap = {
                                'L': 'Lunes',
                                'M': 'Martes',
                                'I': 'Miércoles',
                                'J': 'Jueves',
                                'V': 'Viernes',
                                'S': 'Sábado'
                            };
                            return `Los horarios ${i + 1} y ${j + 1} se superponen el día ${dayMap[dayA]}`;
                        }
                    }
                }
            }
        }
        return null;
    };

    const handleSave = () => {
        if (!name.trim()) {
            setError('El nombre es requerido');
            return;
        }

        // Check for internal conflicts first
        const internalConflict = checkInternalConflicts();
        if (internalConflict) {
            setError(internalConflict);
            return;
        }

        const spacer = {
            id: editingSpacer?.id || `spacer-${Date.now()}`,
            type: 'spacer',
            name: name.trim(),
            schedules: schedules.map(sched => ({
                days: sched.days,
                startTime: HOURS[sched.startIndex],
                endTime: HOURS[sched.endIndex],
                location: sched.location || ''
            })),
            color: selectedColor,
            // Keep old format for backward compatibility
            days: schedules[0].days,
            startTime: HOURS[schedules[0].startIndex],
            endTime: HOURS[schedules[0].endIndex],
            location: schedules[0].location || ''
        };

        const conflictError = onSave(spacer);
        if (conflictError) {
            setError(conflictError);
            return;
        }

        onClose();
    };

    const handleDelete = () => {
        if (editingSpacer && onDelete) {
            onDelete(editingSpacer.id);
            onClose();
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md min-h-[60vh] max-h-[75vh] sm:min-h-0 sm:max-h-[90vh] overflow-hidden flex flex-col border border-gray-700"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-100">
                        {editingSpacer ? 'Editar Horario Personal' : 'Agregar Horario Personal'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-gray-100 flex items-center justify-center"
                        aria-label="Cerrar"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}

                    <div className="space-y-4 sm:space-y-6">
                        {/* Name Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Nombre <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: Gimnasio, Idiomas, Comida..."
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                maxLength={50}
                            />
                        </div>

                        {/* Schedules */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-300">
                                    Horarios ({schedules.length})
                                </label>
                                <button
                                    onClick={addSchedule}
                                    className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                                >
                                    <Plus size={14} />
                                    Agregar
                                </button>
                            </div>

                            <div className="space-y-3">
                                {schedules.map((schedule, index) => (
                                    <div key={schedule.id} className="p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-medium text-gray-400">
                                                Horario {index + 1}
                                            </span>
                                            {schedules.length > 1 && (
                                                <button
                                                    onClick={() => removeSchedule(schedule.id)}
                                                    className="text-red-400 hover:text-red-300 p-1 flex items-center justify-center"
                                                    title="Eliminar horario"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Day Selection */}
                                        <div className="mb-3">
                                            <label className="block text-xs text-gray-400 mb-1">Días</label>
                                            <div className="grid grid-cols-6 gap-1">
                                                {DAYS.map(day => (
                                                    <button
                                                        key={day.id}
                                                        onClick={() => toggleDay(schedule.id, day.id)}
                                                        className={`py-1 px-1 rounded text-xs font-medium transition-colors ${schedule.days.includes(day.id)
                                                                ? 'bg-blue-600 text-white'
                                                                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                                            }`}
                                                    >
                                                        {day.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Time Range */}
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">
                                                Horario: {HOURS[schedule.startIndex]} - {HOURS[schedule.endIndex]}
                                            </label>
                                            <div className="relative h-8 flex items-center">
                                                {/* Track background */}
                                                <div className="absolute w-full h-2 bg-gray-600 rounded-full" />

                                                {/* Active range */}
                                                <div
                                                    className="absolute h-2 bg-blue-500 rounded-full"
                                                    style={{
                                                        left: `${(schedule.startIndex / (HOURS.length - 1)) * 100}%`,
                                                        width: `${((schedule.endIndex - schedule.startIndex) / (HOURS.length - 1)) * 100}%`
                                                    }}
                                                />

                                                {/* Start slider */}
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max={HOURS.length - 1}
                                                    value={schedule.startIndex}
                                                    onChange={(e) => handleStartChange(schedule.id, e)}
                                                    className="absolute w-full appearance-none bg-transparent cursor-pointer slider-thumb pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
                                                    style={{ height: '2rem' }}
                                                />

                                                {/* End slider */}
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max={HOURS.length - 1}
                                                    value={schedule.endIndex}
                                                    onChange={(e) => handleEndChange(schedule.id, e)}
                                                    className="absolute w-full appearance-none bg-transparent cursor-pointer slider-thumb pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
                                                    style={{ height: '2rem' }}
                                                />
                                            </div>
                                        </div>

                                        {/* Location */}
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Lugar (opcional)</label>
                                            <input
                                                type="text"
                                                value={schedule.location}
                                                onChange={(e) => updateLocation(schedule.id, e.target.value)}
                                                placeholder="Ej: Salón 101, Gimnasio..."
                                                className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-gray-100 text-xs placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                                maxLength={50}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Color Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Color
                            </label>
                            <div className="grid grid-cols-5 gap-2">
                                {COLORS.map(color => (
                                    <button
                                        key={color.id}
                                        onClick={() => setSelectedColor(color.id)}
                                        className={`h-10 rounded-lg border-2 transition-all ${selectedColor === color.id
                                                ? 'border-white scale-110'
                                                : 'border-gray-600 hover:border-gray-400'
                                            }`}
                                        style={{ backgroundColor: color.hex }}
                                        title={color.label}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-2 p-4 sm:p-6 border-t border-gray-700">
                    {editingSpacer && (
                        <button
                            onClick={handleDelete}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                            title="Eliminar horario personal"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        {editingSpacer ? 'Guardar' : 'Agregar'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default SpacerModal;
