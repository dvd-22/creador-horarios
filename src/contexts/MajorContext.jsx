import React, { createContext, useState, useContext, useEffect } from 'react';

const AVAILABLE_MAJORS = {
    'cs': {
        id: 'cs',
        name: 'Ciencias de la Computación',
        dataLoader: () => import('../data/ciencias-computacion.json'),
        color: 'gray-600'
    },
    'math': {
        id: 'math',
        name: 'Matemáticas',
        dataLoader: () => import('../data/matematicas.json'),
        color: 'purple-500'
    },
    'physics': {
        id: 'physics',
        name: 'Física',
        dataLoader: () => import('../data/fisica.json'),
        color: 'yellow-500'
    },
    'ap-math': {
        id: 'ap-math',
        name: 'Matemáticas Aplicadas',
        dataLoader: () => import('../data/matematicas-aplicadas.json'),
        color: 'orange-500'
    },
    'actuary': {
        id: 'actuary',
        name: 'Actuaría',
        dataLoader: () => import('../data/actuaria.json'),
        color: 'blue-500'
    },
    'bio-physics': {
        id: 'bio-physics',
        name: 'Física Biomédica',
        dataLoader: () => import('../data/fisica-biomedica.json'),
        color: 'red-500'
    },
    // 'biology': {
    //     id: 'biology',
    //     name: 'Biología',
    //     dataLoader: () => import('../data/biologia.json'),
    //     color: 'green-700'
    // },
};

const MajorContext = createContext();

export const useMajorContext = () => useContext(MajorContext);

export const MajorProvider = ({ children }) => {
    const [selectedMajorId, setSelectedMajorId] = useState('cs');
    const [majorData, setMajorData] = useState({});
    const [loadedMajors, setLoadedMajors] = useState(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState(null);

    // Cache for loaded major data
    const [majorDataCache, setMajorDataCache] = useState({});

    // Load major data when selected major changes
    useEffect(() => {
        const loadMajorData = async () => {
            // If data is already cached, use it
            if (majorDataCache[selectedMajorId]) {
                setMajorData(majorDataCache[selectedMajorId]);
                return;
            }

            // If data is not cached, load it
            setIsLoading(true);
            setLoadError(null);

            try {
                const majorConfig = AVAILABLE_MAJORS[selectedMajorId];
                if (!majorConfig) {
                    throw new Error(`Major configuration not found for ${selectedMajorId}`);
                }

                const dataModule = await majorConfig.dataLoader();
                const data = dataModule.default;

                // Cache the loaded data
                setMajorDataCache(prev => ({
                    ...prev,
                    [selectedMajorId]: data
                }));

                setMajorData(data);
                setLoadedMajors(prev => new Set([...prev, selectedMajorId]));
            } catch (error) {
                console.error(`Error loading data for ${selectedMajorId}:`, error);
                setLoadError(error.message);
                setMajorData({});
            } finally {
                setIsLoading(false);
            }
        };

        loadMajorData();
    }, [selectedMajorId, majorDataCache]);

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
        changeMajor,
        isLoading,
        loadError,
        loadedMajors: Array.from(loadedMajors)
    };

    return (
        <MajorContext.Provider value={value}>
            {children}
        </MajorContext.Provider>
    );
};
