import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getStoredPlans, storePlan, deletePlan } from '../services/api';

const PlansContext = createContext(null);

export function PlansProvider({ children }) {
    const [plans, setPlans] = useState([]);

    useEffect(() => {
        setPlans(getStoredPlans());
    }, []);

    const addPlan = useCallback((plan) => {
        storePlan(plan);
        setPlans(getStoredPlans());
    }, []);

    const removePlan = useCallback((id) => {
        deletePlan(id);
        setPlans(getStoredPlans());
    }, []);

    const refreshPlans = useCallback(() => {
        setPlans(getStoredPlans());
    }, []);

    return (
        <PlansContext.Provider value={{ plans, addPlan, removePlan, refreshPlans }}>
            {children}
        </PlansContext.Provider>
    );
}

export function usePlans() {
    const ctx = useContext(PlansContext);
    if (!ctx) throw new Error('usePlans must be used within a PlansProvider');
    return ctx;
}
