import { useState } from 'react';

export const usePSNEdit = () => {
    const [isEditingPSN, setIsEditingPSN] = useState(false);
    const [editingNPSSO, setEditingNPSSO] = useState('');
    const [updatingPSN, setUpdatingPSN] = useState(false);

    const startEditing = () => {
        setIsEditingPSN(true);
        setEditingNPSSO('');
    };

    const cancelEditing = () => {
        setIsEditingPSN(false);
        setEditingNPSSO('');
    };

    const setNPSSO = (value: string) => {
        setEditingNPSSO(value);
    };

    return {
        isEditingPSN,
        editingNPSSO,
        updatingPSN,
        setUpdatingPSN,
        startEditing,
        cancelEditing,
        setNPSSO
    };
}; 