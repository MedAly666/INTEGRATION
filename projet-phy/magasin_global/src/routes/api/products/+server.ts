import { getProducts } from "$lib/mariadb";

export const GET = async () => {
    let products = await getProducts();
    console.log(products);
    
        
    return new Response(
        JSON.stringify(products),
        {
            headers:
            {
                "Content-Type": "application/json"
            } 
        }
    );
}