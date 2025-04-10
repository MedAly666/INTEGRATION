import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
    let suppliers = [];
    let loading = true;
    let err = null;
    try {
        const response = await fetch('/api/suppliers');
        
        if (response.ok) {
            suppliers = await response.json();
            loading = false;
            
            return { suppliers, loading, err };
        } else {
            error(400, 'Failed to fetch suppliers');
        }
    } catch (e) {
        error(400, 'Error:' + e);
    } finally {
        loading = false;
    }
};