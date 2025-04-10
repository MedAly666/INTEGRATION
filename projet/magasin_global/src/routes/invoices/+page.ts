import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
    let invoices = [];
    let loading = true;
    let err = null;
    try {
        const response = await fetch('/api/invoices');
        
        if (response.ok) {
            invoices = await response.json();
            loading = false;
            
            return { invoices, loading, err };
        } else {
            error(400, 'Failed to fetch invoices');
        }
    } catch (e) {
        error(400, 'Error:' + e);
    } finally {
        loading = false;
    }
};