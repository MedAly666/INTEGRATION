import { getOrdersForClient } from "$lib/mariadb";

export const GET = async ( { params }) => {
    let orders = await getOrdersForClient(params.id);
        
    return new Response(
        JSON.stringify(orders),
        {
            headers:
            {
                "Content-Type": "application/json"
            } 
        }
    );
}