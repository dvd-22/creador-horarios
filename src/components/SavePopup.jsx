import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const SavePopup = ({ onClose }) => {
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col border border-gray-700"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-100">
                        Información Importante
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
                    <div className="text-gray-300 text-sm space-y-4 text-center">
                        <p>
                            Te sugiero que revises fechas y demás información en la{' '}
                            <a
                                href="https://www.fciencias.unam.mx/docencia/horarios/indice"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 underline"
                            >
                                página oficial de la universidad
                            </a>
                            . Este proyecto solo lo creé para facilitar la creación de horarios antes de inscribirse a la facultad.
                        </p>
                        <p>
                            Si guardas el archivo en ICS puedes importarlo a cualquier calendario y tener tus horarios en tu celular.
                        </p>
                        <p>
                            La página fue creada por mí,{' '}
                            <a
                                href="https://github.com/dvd-22/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 underline"
                            >
                                Dvd22
                            </a>
                            . Puedes encontrar el repo{' '}
                            <a
                                href="https://github.com/dvd-22/creador-horarios"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 underline"
                            >
                                aquí
                            </a>
                            .
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 border-t border-gray-700">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default SavePopup;