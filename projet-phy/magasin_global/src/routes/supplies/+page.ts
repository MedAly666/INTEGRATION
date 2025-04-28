import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
    let supplies = [];
    let loading = true;
    let err = null;
    try {
        const response = await fetch('/api/supplies');
        
        if (response.ok) {
            supplies = await response.json();
            loading = false;
            
            return { supplies, loading, err };
        } else {
            error(400, 'Failed to fetch supplies');
        }
    } catch (e) {
        error(400, 'Error:' + e);
    } finally {
        loading = false;
    }
};