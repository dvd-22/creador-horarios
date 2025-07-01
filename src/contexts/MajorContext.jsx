import React, { createContext, useState, useContext, useEffect } from 'react';

// Import all major data JSONs
import computerScienceData from '../data/ciencias-computacion.json';
import mathematicsData from '../data/matematicas.json';
import physicsData from '../data/matematicas.json';
import apMathematicsData from '../data/matematicas.json';
// import biologyData from '../data/biologia.json';

// Define available majors with their info
const AVAILABLE_MAJORS = {
    'cs': {
        id: 'cs',
        name: 'Ciencias de la Computación',
        data: computerScienceData,
        color: 'blue-500'
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
        color: 'green-500'
    },
    'ap-math': {
        id: 'ap-math',
        name: 'Matemáticas Aplicadas',
        data: apMathematicsData,
        color: 'orange-500'
    },
    // 'biology': {
    //     id: 'biology',
    //     name: 'Biología',
    //     data: biologyData,
    //     color: 'green-700'
    // },
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
