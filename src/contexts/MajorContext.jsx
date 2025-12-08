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
    'biology': {
        id: 'biology',
        name: 'Biología',
        color: 'green-700',
        hasStudyPlans: true,
        studyPlans: {
            '1997': {
                id: '1997',
                name: 'Plan 1997',
                dataLoader: () => import('../data/biologia-1997.json')
            },
            '2025': {
                id: '2025',
                name: 'Plan 2025',
                dataLoader: () => import('../data/biologia-2025.json')
            }
        }
    }
};

const MajorContext = createContext();

export const useMajorContext = () => useContext(MajorContext);

export const MajorProvider = ({ children }) => {
    const [selectedMajorId, setSelectedMajorId] = useState('cs');
    const [selectedStudyPlan, setSelectedStudyPlan] = useState(null);
    const [majorData, setMajorData] = useState({});
    const [loadedMajors, setLoadedMajors] = useState(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState(null);

    // Cache for loaded major data
    const [majorDataCache, setMajorDataCache] = useState({});

    // Filter state - persists across major changes
    const [filters, setFilters] = useState({
        mode: 'range',
        startTime: null,
        endTime: null,
        exactTimes: [],
        days: ['L', 'M', 'I', 'J', 'V', 'S'],
        blockedHours: []
    });

    // Load major data when selected major or study plan changes
    useEffect(() => {
        const loadMajorData = async () => {
            const majorConfig = AVAILABLE_MAJORS[selectedMajorId];
            if (!majorConfig) {
                setLoadError(`Major configuration not found for ${selectedMajorId}`);
                return;
            }

            // Determine cache key and data loader
            let cacheKey = selectedMajorId;
            let dataLoader = majorConfig.dataLoader;

            if (majorConfig.hasStudyPlans) {
                const studyPlanId = selectedStudyPlan || Object.keys(majorConfig.studyPlans)[0];
                cacheKey = `${selectedMajorId}-${studyPlanId}`;
                dataLoader = majorConfig.studyPlans[studyPlanId]?.dataLoader;

                if (!dataLoader) {
                    setLoadError(`Study plan not found: ${studyPlanId}`);
                    return;
                }

                // Set default study plan if none selected
                if (!selectedStudyPlan) {
                    setSelectedStudyPlan(studyPlanId);
                }
            }

            // If data is already cached, use it
            if (majorDataCache[cacheKey]) {
                setMajorData(majorDataCache[cacheKey]);
                return;
            }

            // If data is not cached, load it
            setIsLoading(true);
            setLoadError(null);

            try {
                const dataModule = await dataLoader();
                const data = dataModule.default;

                // Cache the loaded data
                setMajorDataCache(prev => ({
                    ...prev,
                    [cacheKey]: data
                }));

                setMajorData(data);
                setLoadedMajors(prev => new Set([...prev, cacheKey]));
            } catch (error) {
                console.error(`Error loading data for ${cacheKey}:`, error);
                setLoadError(error.message);
                setMajorData({});
            } finally {
                setIsLoading(false);
            }
        };

        loadMajorData();
    }, [selectedMajorId, selectedStudyPlan, majorDataCache]);

    const changeMajor = (majorId, studyPlanId = null) => {
        if (AVAILABLE_MAJORS[majorId]) {
            setSelectedMajorId(majorId);
            // Set study plan if provided, otherwise reset to null
            setSelectedStudyPlan(studyPlanId);
        }
    };

    const changeStudyPlan = (studyPlanId) => {
        const majorConfig = AVAILABLE_MAJORS[selectedMajorId];
        if (majorConfig?.hasStudyPlans && majorConfig.studyPlans[studyPlanId]) {
            setSelectedStudyPlan(studyPlanId);
        }
    };

    const updateFilters = (newFilters) => {
        setFilters(newFilters);
    };

    const value = {
        selectedMajorId,
        selectedStudyPlan,
        currentMajor: AVAILABLE_MAJORS[selectedMajorId],
        majorData,
        availableMajors: AVAILABLE_MAJORS,
        changeMajor,
        changeStudyPlan,
        isLoading,
        loadError,
        loadedMajors: Array.from(loadedMajors),
        filters,
        updateFilters
    };

    return (
        <MajorContext.Provider value={value}>
            {children}
        </MajorContext.Provider>
    );
};
