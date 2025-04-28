import { getEmployees } from "$lib/mariadb";

export const GET = async () => {
    let employees = await getEmployees();
        
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