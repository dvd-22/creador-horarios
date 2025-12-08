import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const HOURS = [
    '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
    '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
];

const FilterModal = ({ isOpen, onClose, filters, onApplyFilters }) => {
    const [filterMode, setFilterMode] = useState(filters.mode || 'range');
    const [startTime, setStartTime] = useState(filters.startTime || '07:00');
    const [endTime, setEndTime] = useState(filters.endTime || '22:00');
    const [exactTimes, setExactTimes] = useState(filters.exactTimes || []);
    const [newExactTime, setNewExactTime] = useState('');

    useEffect(() => {
        if (isOpen) {
            setFilterMode(filters.mode || 'range');
            setStartTime(filters.startTime || '07:00');
            setEndTime(filters.endTime || '22:00');
            setExactTimes(filters.exactTimes || []);
        }
    }, [isOpen, filters]);

    const handleApply = () => {
        onApplyFilters({
            mode: filterMode,
            startTime: filterMode === 'range' ? startTime : null,
            endTime: filterMode === 'range' ? endTime : null,
            exactTimes: filterMode === 'exact' ? exactTimes : []
        });
        onClose();
    };

    const handleClearAll = () => {
        onApplyFilters({
            mode: 'range',
            startTime: null,
            endTime: null,
            exactTimes: []
        });
        onClose();
    };

    const addExactTime = () => {
        if (newExactTime && !exactTimes.includes(newExactTime)) {
            setExactTimes([...exactTimes, newExactTime].sort());
            setNewExactTime('');
        }
    };

    const removeExactTime = (time) => {
        setExactTimes(exactTimes.filter(t => t !== time));
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-gray-100">Filtros de Horario</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center"
                        aria-label="Cerrar"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Filter Mode Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Tipo de filtro
                        </label>
                        <div className="space-y-2">
                            <label className="flex items-center p-3 bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-700/50 transition-colors">
                                <input
                                    type="radio"
                                    name="filterMode"
                                    value="range"
                                    checked={filterMode === 'range'}
                                    onChange={(e) => setFilterMode(e.target.value)}
                                    className="mr-3"
                                />
                                <div>
                                    <div className="text-gray-100 font-medium">Rango de horas</div>
                                    <div className="text-xs text-gray-400">Clases entre horarios específicos</div>
                                </div>
                            </label>
                            <label className="flex items-center p-3 bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-700/50 transition-colors">
                                <input
                                    type="radio"
                                    name="filterMode"
                                    value="exact"
                                    checked={filterMode === 'exact'}
                                    onChange={(e) => setFilterMode(e.target.value)}
                                    className="mr-3"
                                />
                                <div>
                                    <div className="text-gray-100 font-medium">Horas exactas</div>
                                    <div className="text-xs text-gray-400">Clases en horarios específicos</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Range Mode */}
                    {filterMode === 'range' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Hora de inicio
                                </label>
                                <select
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full p-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
                                >
                                    {HOURS.map(hour => (
                                        <option key={hour} value={hour}>{hour}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Hora de fin
                                </label>
                                <select
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="w-full p-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
                                >
                                    {HOURS.map(hour => (
                                        <option key={hour} value={hour}>{hour}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
                                <p className="text-xs text-blue-200">
                                    Se mostrarán clases que se impartan completamente entre {startTime} y {endTime}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Exact Mode */}
                    {filterMode === 'exact' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Agregar hora
                                </label>
                                <div className="flex gap-2">
                                    <select
                                        value={newExactTime}
                                        onChange={(e) => setNewExactTime(e.target.value)}
                                        className="flex-1 p-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="">Seleccionar hora...</option>
                                        {HOURS.map(hour => (
                                            <option key={hour} value={hour}>{hour}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={addExactTime}
                                        disabled={!newExactTime}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {exactTimes.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Horas seleccionadas
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {exactTimes.map(time => (
                                            <div
                                                key={time}
                                                className="flex items-center gap-2 px-3 py-1 bg-blue-600/20 border border-blue-500/50 rounded-full"
                                            >
                                                <span className="text-sm text-blue-200">{time}</span>
                                                <button
                                                    onClick={() => removeExactTime(time)}
                                                    className="text-blue-300 hover:text-blue-100 transition-colors"
                                                    aria-label={`Eliminar ${time}`}
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3 mt-3">
                                        <p className="text-xs text-blue-200">
                                            Se mostrarán clases que comiencen exactamente a estas horas
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 flex gap-2">
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
