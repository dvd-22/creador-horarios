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
    const [startIndex, setStartIndex] = useState(0);
    const [endIndex, setEndIndex] = useState(HOURS.length - 1);

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

    const handleApply = () => {
        onApplyFilters({
            mode: 'range',
            startTime: HOURS[startIndex],
            endTime: HOURS[endIndex],
            exactTimes: []
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

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
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
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-4">
                            Rango de horas
                        </label>

                        {/* Time Display */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-center">
                                <div className="text-xs text-gray-400 mb-1">Inicio</div>
                                <div className="text-2xl font-bold text-blue-400">{HOURS[startIndex]}</div>
                            </div>
                            <div className="text-gray-500">—</div>
                            <div className="text-center">
                                <div className="text-xs text-gray-400 mb-1">Fin</div>
                                <div className="text-2xl font-bold text-blue-400">{HOURS[endIndex]}</div>
                            </div>
                        </div>

                        {/* Dual Handle Range Slider */}
                        <div className="relative h-12 mb-2">
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

                    <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
                        <p className="text-xs text-blue-200">
                            Se mostrarán clases que se impartan completamente entre {HOURS[startIndex]} y {HOURS[endIndex]}
                        </p>
                    </div>
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
