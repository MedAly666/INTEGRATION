import { getInvoices } from "$lib/mariadb";

export const GET = async () => {
    let invoices = await getInvoices();
        
    return new Response(
        JSON.stringify(invoices),
        {
            headers:
            {
                "Content-Type": "application/json"
            } 
        }
    );
}