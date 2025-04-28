import { getOrders } from "$lib/mariadb";

export const GET = async () => {
    let orders = await getOrders();    
        
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