import React, { createContext, useState, useContext, useEffect } from 'react';

import computerScienceData from '../data/ciencias-computacion.json';
import mathematicsData from '../data/matematicas.json';
import physicsData from '../data/fisica.json';
import apMathematicsData from '../data/matematicas-aplicadas.json';
import biologyData from '../data/biologia.json';
import actuaryData from '../data/actuaria.json';

const AVAILABLE_MAJORS = {
    'cs': {
        id: 'cs',
        name: 'Ciencias de la Computación',
        data: computerScienceData,
        color: 'gray-600' // Changed from 'black-200' to a valid Tailwind color
    },
    'math': {
        id: 'math',
        name: 'Matemáticas',
        data: mathematicsData,
        color: 'purple-500'
    },
    'physics': {
        id: 'physics',
        name: 'Física',
        data: physicsData,
        color: 'yellow-500'
    },
    'ap-math': {
        id: 'ap-math',
        name: 'Matemáticas Aplicadas',
        data: apMathematicsData,
        color: 'orange-500'
    },
    'actuary': {
        id: 'actuary',
        name: 'Actuaría',
        data: actuaryData,
        color: 'blue-500'
    },
    'biology': {
        id: 'biology',
        name: 'Biología',
        data: biologyData,
        color: 'green-700'
    },
};

const MajorContext = createContext();

export const useMajorContext = () => useContext(MajorContext);

export const MajorProvider = ({ children }) => {
    const [selectedMajorId, setSelectedMajorId] = useState('cs');
    const [majorData, setMajorData] = useState({});

    // Update majorData when the selected major changes
    useEffect(() => {
        setMajorData(AVAILABLE_MAJORS[selectedMajorId].data);
    }, [selectedMajorId]);

    const changeMajor = (majorId) => {
        if (AVAILABLE_MAJORS[majorId]) {
            setSelectedMajorId(majorId);
        }
    };

    const value = {
        selectedMajorId,
        currentMajor: AVAILABLE_MAJORS[selectedMajorId],
        majorData,
        availableMajors: AVAILABLE_MAJORS,
        changeMajor
    };

    return (
        <MajorContext.Provider value={value}>
            {children}
        </MajorContext.Provider>
    );
};
