import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load:PageLoad = async ({ params }) => {
    let products = [];
    let loading = true;
    let err = null;
    try {
        const response = await fetch('/api/products');
        
        if (response.ok) {
            products = await response.json();
            console.log('products:', products);
            
            loading = false;
            
            return { products, loading, err };
        } else {
            error( 400, 'Failed to fetch products');
        }
    } catch (e) {
        error( 400, 'Error:'+ e);
    } finally {
        loading = false;
    }
}