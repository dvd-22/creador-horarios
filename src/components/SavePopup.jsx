import React from 'react';

const SavePopup = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4 border border-gray-700">
                <div className="text-center mb-6">
                    Te sugiero que revises fechas y demás información en la&nbsp;
                    <a
                        href="https://www.fciencias.unam.mx/docencia/horarios/indice"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300"
                    >
                        página oficial de la universidad
                    </a>
                    . Este proyecto
                    solo lo creé para facilitar la creación de horarios antes de inscribirse a la facultad.<br /><br />
                    Si guardas el archivo en ICS puedes importarlo a cualquier calendario y tener tus horarios en tu celular.<br /><br />
                    La página fue creada por mi, &nbsp;
                    <a
                        href="https://github.com/dvd-22/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300"
                    >
                        Dvd22
                    </a>. Puedes encontrar el repo&nbsp;
                    <a
                        href="https://github.com/dvd-22/creador-horarios"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300"
                    >
                        aquí.
                    </a>
                </div>
                <button
                    onClick={onClose}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
                >
                    Ok
                </button>
            </div>
        </div>
    );
};

export default SavePopup;