import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
    let orders = [];
    let loading = true;
    let err = null;
    try {
        const response = await fetch('/api/orders');
        
        if (response.ok) {
            orders = await response.json();
            loading = false;
            
            return { orders, loading, err };
        } else {
            error(400, 'Failed to fetch orders');
        }
    } catch (e) {
        error(400, 'Error:' + e);
    } finally {
        loading = false;
    }
};