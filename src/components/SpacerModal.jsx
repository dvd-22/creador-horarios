import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2 } from 'lucide-react';

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
    const [selectedDays, setSelectedDays] = useState(['L', 'M', 'I', 'J', 'V', 'S']);
    const [startIndex, setStartIndex] = useState(0);
    const [endIndex, setEndIndex] = useState(2);
    const [selectedColor, setSelectedColor] = useState('bg-blue-700/50');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Clear error when opening
            setError('');

            if (editingSpacer) {
                setName(editingSpacer.name || '');
                setSelectedDays(editingSpacer.days || ['L', 'M', 'I', 'J', 'V', 'S']);
                setSelectedColor(editingSpacer.color || 'bg-blue-700/50');

                if (editingSpacer.startTime) {
                    const idx = HOURS.indexOf(editingSpacer.startTime);
                    if (idx !== -1) setStartIndex(idx);
                }
                if (editingSpacer.endTime) {
                    const idx = HOURS.indexOf(editingSpacer.endTime);
                    if (idx !== -1) setEndIndex(idx);
                }
            } else {
                // Reset for new spacer
                setName('');
                setSelectedDays(['L', 'M', 'I', 'J', 'V', 'S']);
                setStartIndex(0);
                setEndIndex(2);
                setSelectedColor('bg-blue-700/50');
            }
        }
    }, [isOpen, editingSpacer]);

    const handleStartChange = (e) => {
        const newStart = parseInt(e.target.value);
        const minGap = 1; // Minimum 30 minutes
        const maxAllowedStart = endIndex - minGap;

        if (newStart <= maxAllowedStart) {
            setStartIndex(newStart);
        } else {
            setStartIndex(maxAllowedStart);
        }
    };

    const handleEndChange = (e) => {
        const newEnd = parseInt(e.target.value);
        const minGap = 1; // Minimum 30 minutes
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
                if (prev.length === 1) return prev; // Don't allow deselecting last day
                return prev.filter(d => d !== dayId);
            } else {
                return [...prev, dayId].sort((a, b) => {
                    const order = ['L', 'M', 'I', 'J', 'V', 'S'];
                    return order.indexOf(a) - order.indexOf(b);
                });
            }
        });
    };

    const handleSave = () => {
        if (!name.trim()) {
            setError('El nombre es requerido');
            return;
        }

        const spacer = {
            id: editingSpacer?.id || `spacer-${Date.now()}`,
            type: 'spacer',
            name: name.trim(),
            days: selectedDays,
            startTime: HOURS[startIndex],
            endTime: HOURS[endIndex],
            color: selectedColor
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
                        className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-gray-100"
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

                        {/* Day Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Días
                            </label>
                            <div className="grid grid-cols-6 gap-2">
                                {DAYS.map(day => (
                                    <button
                                        key={day.id}
                                        onClick={() => toggleDay(day.id)}
                                        className={`py-2 px-1 rounded-lg text-xs sm:text-sm font-medium transition-colors ${selectedDays.includes(day.id)
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            }`}
                                    >
                                        {day.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Time Range Slider */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Horario: {HOURS[startIndex]} - {HOURS[endIndex]}
                            </label>
                            <div className="relative h-8 flex items-center">
                                {/* Track background */}
                                <div className="absolute w-full h-2 bg-gray-700 rounded-full" />

                                {/* Active range */}
                                <div
                                    className="absolute h-2 bg-blue-500 rounded-full"
                                    style={{
                                        left: `${(startIndex / (HOURS.length - 1)) * 100}%`,
                                        width: `${((endIndex - startIndex) / (HOURS.length - 1)) * 100}%`
                                    }}
                                />

                                {/* Start slider */}
                                <input
                                    type="range"
                                    min="0"
                                    max={HOURS.length - 1}
                                    value={startIndex}
                                    onChange={handleStartChange}
                                    className="absolute w-full appearance-none bg-transparent cursor-pointer slider-thumb pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
                                    style={{ height: '2rem' }}
                                />

                                {/* End slider */}
                                <input
                                    type="range"
                                    min="0"
                                    max={HOURS.length - 1}
                                    value={endIndex}
                                    onChange={handleEndChange}
                                    className="absolute w-full appearance-none bg-transparent cursor-pointer slider-thumb pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
                                    style={{ height: '2rem' }}
                                />
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
