import { getSuppliers } from "$lib/mariadb";

export const GET = async () => {
    let suppliers = await getSuppliers();    
        
    return new Response(
        JSON.stringify(suppliers),
        {
            headers:
            {
                "Content-Type": "application/json"
            } 
        }
    );
}