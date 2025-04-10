import { getClients } from "$lib/mariadb";

export const GET = async () => {
    let clients = await getClients();
        
    return new Response(
        JSON.stringify(clients),
        {
            headers:
            {
                "Content-Type": "application/json"
            } 
        }
    );
}