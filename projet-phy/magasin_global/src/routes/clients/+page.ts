
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';



export const load: PageLoad = async ({ params }) => {
    let clients = [];
    let loading = true;
    let err = null;
	try {
        const response = await fetch('/api/clients');
        
        if (response.ok) {
            clients = await response.json();
            loading = false;
            
            return { clients, loading, err };
        } else {
            error( 400, 'Failed to fetch clients');
        }
    } catch (e) {
        error( 400, 'Error:'+ e);
    } finally {
        loading = false;
    }
};