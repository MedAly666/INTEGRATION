
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { Client, Commande } from '$lib/types/database';



export const load: PageLoad = async ({ params }) => {
	const id = params.id;	

	let client:Client;
	let orders:Commande[] = [];
	let loading = true;
	let err = null;
	try {
		let response = await fetch(`/api/clients/${id}`);
		
		if (response.ok) {
			client = (await response.json())[0];
		} else {
			error( 400, 'Failed to fetch client');
		}

		response = await fetch(`/api/clients/${id}/orders`);
		if (response.ok) {
			orders = await response.json();
		}
		else {
			error( 400, 'Failed to fetch client orders');
		}

		console.log('orders:', orders);
		

		return {
			client,
			orders,
			loading,
			err
		};

	} catch (e) {
		error( 400, 'Error:'+ e);
	} finally {
		loading = false;
	}
    
};