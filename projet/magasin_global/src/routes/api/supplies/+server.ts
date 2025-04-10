import { getSupplyChain } from "$lib/mariadb";

export const GET = async () => {
    let employees = await getSupplyChain();
        
    return new Response(
        JSON.stringify(employees),
        {
            headers:
            {
                "Content-Type": "application/json"
            } 
        }
    );
}