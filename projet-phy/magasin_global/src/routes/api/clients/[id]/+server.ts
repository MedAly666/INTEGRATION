import { getClientById } from "$lib/mariadb";

export const GET = async ( { params }) => {
    
    let client = await getClientById(params.id);
        
    return new Response(
        JSON.stringify(client),
        {
            headers:
            {
                "Content-Type": "application/json"
            } 
        }
    );
}