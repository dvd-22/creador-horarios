import React, { useState, useEffect } from 'react';
import { professorRatingService } from '../services/professorRatingService';

const ProfessorRating = ({ professorName, className = "" }) => {
    const [rating, setRating] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [url, setUrl] = useState(null);

    useEffect(() => {
        if (!professorName) return;

        const fetchRating = async () => {
            setLoading(true);
            setError(false);

            try {
                const result = await professorRatingService.getProfessorRating(professorName);

                if (result) {
                    setRating(result.rating);
                    setUrl(result.url);
                } else {
                    setError(true);
                }
            } catch (err) {
                console.error('Error fetching rating for', professorName, err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchRating();
    }, [professorName]);

    const handleClick = () => {
        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    if (loading) {
        return (
            <span className={`inline-flex items-center px-2 py-1 h-[26px] text-xs font-medium bg-gray-700 text-gray-400 rounded animate-pulse ${className}`}>
                <div className="w-2 h-2 bg-gray-500 rounded-full mr-1 animate-bounce"></div>
                ...
            </span>
        );
    }

    if (error || rating === null) {
        return (
            <span className={`inline-flex items-center px-2 py-1 h-[26px] text-xs font-medium bg-gray-600 text-gray-400 rounded ${className}`}>
                N/A
            </span>
        );
    }

    const colorClass = professorRatingService.getRatingColor(rating);
    const bgColorClass = professorRatingService.getRatingBgColor(rating);

    return (
        <span
            className={`inline-flex items-center px-2 py-1 h-[26px] text-xs font-medium text-white rounded cursor-pointer hover:opacity-80 transition-opacity ${bgColorClass} ${className}`}
            onClick={handleClick}
            title={`Calificación: ${rating}/10 - Click para ver en MisProfesores.com`}
        >
            {rating}
        </span>
    );
};

export default ProfessorRating;
