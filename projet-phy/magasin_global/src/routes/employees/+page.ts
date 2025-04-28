import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
    let employees = [];
    let loading = true;
    let err = null;
    try {
        const response = await fetch('/api/employees');
        
        if (response.ok) {
            employees = await response.json();
            loading = false;
            
            return { employees, loading, err };
        } else {
            error( 400, 'Failed to fetch employees');
        }
    } catch (e) {
        error( 400, 'Error:'+ e);
    } finally {
        loading = false;
    }
};