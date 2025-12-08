import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

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

const MODALITIES = [
    { id: 'Presencial', label: 'Presencial' },
    { id: 'Virtual', label: 'Virtual' }
];

const FilterModal = ({ isOpen, onClose, filters, onApplyFilters }) => {
    const [startIndex, setStartIndex] = useState(0);
    const [endIndex, setEndIndex] = useState(HOURS.length - 1);
    const [selectedDays, setSelectedDays] = useState(['L', 'M', 'I', 'J', 'V', 'S']);
    const [selectedModalities, setSelectedModalities] = useState(['Presencial', 'Virtual']);
    const [blockedHours, setBlockedHours] = useState([]);
    const [newBlockStart, setNewBlockStart] = useState(0);
    const [newBlockEnd, setNewBlockEnd] = useState(1);

    useEffect(() => {
        if (isOpen) {
            if (filters.startTime) {
                const idx = HOURS.indexOf(filters.startTime);
                if (idx !== -1) setStartIndex(idx);
            } else {
                setStartIndex(0);
            }

            if (filters.endTime) {
                const idx = HOURS.indexOf(filters.endTime);
                if (idx !== -1) setEndIndex(idx);
            } else {
                setEndIndex(HOURS.length - 1);
            }

            if (filters.days && filters.days.length > 0) {
                setSelectedDays(filters.days);
            } else {
                setSelectedDays(['L', 'M', 'I', 'J', 'V', 'S']);
            }

            if (filters.blockedHours && filters.blockedHours.length > 0) {
                setBlockedHours(filters.blockedHours);
            } else {
                setBlockedHours([]);
            }

            if (filters.modalities && filters.modalities.length > 0) {
                setSelectedModalities(filters.modalities);
            } else {
                setSelectedModalities(['Presencial', 'Virtual']);
            }
        }
    }, [isOpen, filters]);

    const handleStartChange = (e) => {
        const newStart = parseInt(e.target.value);
        const minGap = 2; // 1 hour = 2 intervals of 30 minutes
        const maxAllowedStart = endIndex - minGap;

        if (newStart <= maxAllowedStart) {
            setStartIndex(newStart);
        } else {
            setStartIndex(maxAllowedStart);
        }
    };

    const handleEndChange = (e) => {
        const newEnd = parseInt(e.target.value);
        const minGap = 2; // 1 hour = 2 intervals of 30 minutes
        const minAllowedEnd = startIndex + minGap;

        if (newEnd >= minAllowedEnd) {
            setEndIndex(newEnd);
        } else {
            setEndIndex(minAllowedEnd);
        }
    };

    const toggleDay = (dayId) => {
        setSelectedDays(prev => {
            if (prev.includes(dayId)) {
                // Don't allow deselecting if it's the last day
                if (prev.length === 1) return prev;
                return prev.filter(d => d !== dayId);
            } else {
                return [...prev, dayId].sort((a, b) => {
                    const order = ['L', 'M', 'I', 'J', 'V', 'S'];
                    return order.indexOf(a) - order.indexOf(b);
                });
            }
        });
    };

    const toggleModality = (modalityId) => {
        setSelectedModalities(prev => {
            if (prev.includes(modalityId)) {
                // Don't allow deselecting if it's the last modality
                if (prev.length === 1) return prev;
                return prev.filter(m => m !== modalityId);
            } else {
                return [...prev, modalityId];
            }
        });
    };

    const addBlockedHour = () => {
        const newBlock = {
            startTime: HOURS[newBlockStart],
            endTime: HOURS[newBlockEnd]
        };
        setBlockedHours(prev => [...prev, newBlock]);
        // Reset to default values
        setNewBlockStart(0);
        setNewBlockEnd(1);
    };

    const removeBlockedHour = (index) => {
        setBlockedHours(prev => prev.filter((_, i) => i !== index));
    };

    const handleBlockStartChange = (e) => {
        const newStart = parseInt(e.target.value);
        setNewBlockStart(newStart);
        if (newStart >= newBlockEnd) {
            setNewBlockEnd(Math.min(newStart + 1, HOURS.length - 1));
        }
    };

    const handleBlockEndChange = (e) => {
        const newEnd = parseInt(e.target.value);
        setNewBlockEnd(newEnd);
        if (newEnd <= newBlockStart) {
            setNewBlockStart(Math.max(0, newEnd - 1));
        }
    };

    const handleApply = () => {
        // Only set startTime/endTime if they're not at default positions
        const isDefaultTimeRange = startIndex === 0 && endIndex === HOURS.length - 1;

        onApplyFilters({
            mode: 'range',
            startTime: isDefaultTimeRange ? null : HOURS[startIndex],
            endTime: isDefaultTimeRange ? null : HOURS[endIndex],
            exactTimes: [],
            days: selectedDays,
            blockedHours: blockedHours,
            modalities: selectedModalities
        });
        onClose();
    };

    const handleClearAll = () => {
        // Reset local state
        setStartIndex(0);
        setEndIndex(HOURS.length - 1);
        setSelectedDays(['L', 'M', 'I', 'J', 'V', 'S']);
        setSelectedModalities(['Presencial', 'Virtual']);
        setBlockedHours([]);

        // Apply cleared filters
        onApplyFilters({
            mode: 'range',
            startTime: null,
            endTime: null,
            exactTimes: [],
            days: ['L', 'M', 'I', 'J', 'V', 'S'],
            blockedHours: [],
            modalities: ['Presencial', 'Virtual']
        });
        // Don't close the modal
    }; if (!isOpen) return null;

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
                <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-700">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-100">Filtros de Horario</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center"
                        aria-label="Cerrar"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Filter Summary */}
                <div className="px-4 sm:px-6 pt-4 pb-2 border-b border-gray-700 bg-gray-900/50">
                    <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
                        <p className="text-xs text-blue-200">
                            {selectedDays.length === 6 ? (
                                <>
                                    Se mostrarán clases que se impartan todos los días de {HOURS[startIndex]} a {HOURS[endIndex]}
                                    {blockedHours.length > 0 && (
                                        <> excepto de {blockedHours.map((block, index) => {
                                            if (index === blockedHours.length - 1 && blockedHours.length > 1) {
                                                return ` y de ${block.startTime} a ${block.endTime}`;
                                            }
                                            return index === 0 ? `${block.startTime} a ${block.endTime}` : `, de ${block.startTime} a ${block.endTime}`;
                                        }).join('')}</>
                                    )}
                                    {selectedModalities.length === 1 && (
                                        <> en modalidad {selectedModalities[0].toLowerCase()}</>
                                    )}
                                </>
                            ) : (
                                <>
                                    Se mostrarán clases que se impartan el{' '}
                                    {selectedDays.map((dayId, index) => {
                                        const day = DAYS.find(d => d.id === dayId);
                                        const dayLabel = day?.label.toLowerCase() || dayId;
                                        if (index === selectedDays.length - 1 && selectedDays.length > 1) {
                                            return ` y ${dayLabel}`;
                                        }
                                        return index === 0 ? dayLabel : `, ${dayLabel}`;
                                    }).join('')} de {HOURS[startIndex]} a {HOURS[endIndex]}
                                    {blockedHours.length > 0 && (
                                        <> excepto de {blockedHours.map((block, index) => {
                                            if (index === blockedHours.length - 1 && blockedHours.length > 1) {
                                                return ` y de ${block.startTime} a ${block.endTime}`;
                                            }
                                            return index === 0 ? `${block.startTime} a ${block.endTime}` : `, de ${block.startTime} a ${block.endTime}`;
                                        }).join('')}</>
                                    )}
                                    {selectedModalities.length === 1 && (
                                        <> en modalidad {selectedModalities[0].toLowerCase()}</>
                                    )}
                                </>
                            )}
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
                    {/* Day Toggles */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                            Días de la semana
                        </label>
                        <div className="grid grid-cols-6 gap-2">
                            {DAYS.map(day => (
                                <button
                                    key={day.id}
                                    onClick={() => toggleDay(day.id)}
                                    className={`px-2 py-2 rounded-lg font-medium text-xs transition-all ${selectedDays.includes(day.id)
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                        }`}
                                    title={day.full}
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Modality Toggles */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                            Modalidad
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {MODALITIES.map(modality => (
                                <button
                                    key={modality.id}
                                    onClick={() => toggleModality(modality.id)}
                                    className={`px-3 py-2 rounded-lg font-medium text-sm transition-all ${selectedModalities.includes(modality.id)
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                        }`}
                                >
                                    {modality.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-4">
                            Rango de horas
                        </label>

                        {/* Time Display */}
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-center">
                                <div className="text-xs text-gray-400 mb-1">Inicio</div>
                                <div className="text-base font-bold text-blue-400">{HOURS[startIndex]}</div>
                            </div>
                            <div className="text-gray-500 text-sm">—</div>
                            <div className="text-center">
                                <div className="text-xs text-gray-400 mb-1">Fin</div>
                                <div className="text-base font-bold text-blue-400">{HOURS[endIndex]}</div>
                            </div>
                        </div>

                        {/* Dual Handle Range Slider */}
                        <div className="relative h-10 mb-2">
                            {/* Track Background */}
                            <div className="absolute top-1/2 -translate-y-1/2 w-full h-2 bg-gray-700 rounded-lg"></div>

                            {/* Active Track */}
                            <div
                                className="absolute top-1/2 -translate-y-1/2 h-2 bg-blue-500 rounded-lg pointer-events-none"
                                style={{
                                    left: `${(startIndex / (HOURS.length - 1)) * 100}%`,
                                    right: `${100 - (endIndex / (HOURS.length - 1)) * 100}%`
                                }}
                            ></div>

                            {/* Start Handle Slider */}
                            <input
                                type="range"
                                min="0"
                                max={HOURS.length - 1}
                                value={startIndex}
                                onChange={handleStartChange}
                                className="absolute top-1/2 -translate-y-1/2 w-full appearance-none bg-transparent cursor-pointer slider-thumb pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
                            />

                            {/* End Handle Slider */}
                            <input
                                type="range"
                                min="0"
                                max={HOURS.length - 1}
                                value={endIndex}
                                onChange={handleEndChange}
                                className="absolute top-1/2 -translate-y-1/2 w-full appearance-none bg-transparent cursor-pointer slider-thumb pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
                            />
                        </div>
                    </div>

                    {/* Blocked Hours Section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                            Bloquear horas
                        </label>

                        {/* Add Blocked Hour */}
                        <div className="space-y-3">
                            {/* Time Display */}
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-center">
                                    <div className="text-xs text-gray-400 mb-1">Desde</div>
                                    <div className="text-base font-bold text-red-400">{HOURS[newBlockStart]}</div>
                                </div>
                                <div className="text-gray-500 text-sm">—</div>
                                <div className="text-center">
                                    <div className="text-xs text-gray-400 mb-1">Hasta</div>
                                    <div className="text-base font-bold text-red-400">{HOURS[newBlockEnd]}</div>
                                </div>
                            </div>

                            {/* Slider and Button Container */}
                            <div className="flex gap-2 items-center">
                                {/* Dual Handle Range Slider for Block */}
                                <div className="relative h-10 flex-1">
                                    {/* Track Background */}
                                    <div className="absolute top-1/2 -translate-y-1/2 w-full h-2 bg-gray-700 rounded-lg"></div>

                                    {/* Active Track */}
                                    <div
                                        className="absolute top-1/2 -translate-y-1/2 h-2 bg-red-500 rounded-lg pointer-events-none"
                                        style={{
                                            left: `${(newBlockStart / (HOURS.length - 1)) * 100}%`,
                                            right: `${100 - (newBlockEnd / (HOURS.length - 1)) * 100}%`
                                        }}
                                    ></div>

                                    {/* Start Handle Slider */}
                                    <input
                                        type="range"
                                        min="0"
                                        max={HOURS.length - 1}
                                        value={newBlockStart}
                                        onChange={handleBlockStartChange}
                                        className="absolute top-1/2 -translate-y-1/2 w-full appearance-none bg-transparent cursor-pointer slider-thumb pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
                                    />

                                    {/* End Handle Slider */}
                                    <input
                                        type="range"
                                        min="0"
                                        max={HOURS.length - 1}
                                        value={newBlockEnd}
                                        onChange={handleBlockEndChange}
                                        className="absolute top-1/2 -translate-y-1/2 w-full appearance-none bg-transparent cursor-pointer slider-thumb pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
                                    />
                                </div>

                                <button
                                    onClick={addBlockedHour}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                                >
                                    Agregar
                                </button>
                            </div>                            {/* List of Blocked Hours */}
                            {blockedHours.length > 0 && (
                                <div className="space-y-2">
                                    {blockedHours.map((block, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between px-3 py-2 bg-gray-700 rounded-lg"
                                        >
                                            <span className="text-sm text-gray-200">
                                                {block.startTime} — {block.endTime}
                                            </span>
                                            <button
                                                onClick={() => removeBlockedHour(index)}
                                                className="p-1 hover:bg-gray-600 rounded transition-colors flex items-center justify-center"
                                                aria-label="Eliminar"
                                            >
                                                <X size={16} className="text-gray-400" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-3 sm:p-4 border-t border-gray-700 flex gap-2">
                    <button
                        onClick={handleClearAll}
                        className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
                    >
                        Limpiar Filtros
                    </button>
                    <button
                        onClick={handleApply}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        Aplicar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default FilterModal;
