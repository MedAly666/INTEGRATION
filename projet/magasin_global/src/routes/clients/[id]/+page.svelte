<script lang="ts">
    import { Badge, Button, Card, Heading, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
    import { ChevronLeftOutline, PenOutline } from 'flowbite-svelte-icons';
    import type { Client, Commande } from '$lib/types/database';
    import type { PageProps } from './$types';

    // Import client data from page.js load function
    let { data } : PageProps = $props();
    const client: Client = data.client;
    const orders: Commande[] = data.orders || [];

    type BadgeColor = "blue" | "green" | "purple" | "none" | "red" | "yellow" | "dark" | "primary" | "indigo" | "pink" | undefined ;
    function getSourceBadgeColor(source: string): BadgeColor {
        switch (source) {
            case 'SQL': return 'blue';
            case 'NEO4J': return 'green';
            case 'XML': return 'purple';
            default: return 'dark';
        }
    }

    function getOrderStatusColor(status: string): BadgeColor {
        switch (status?.toLowerCase()) {
            case 'completed': return 'green';
            case 'processing': return 'yellow';
            case 'shipped': return 'blue';
            case 'cancelled': return 'red';
            case 'pending': return 'purple';
            default: return 'dark';
        }
    }

    function formatDate(date: Date | string | null): string {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('fr-FR');
    }

    function formatPrice(amount: number): string {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
    }
</script>

<div class="space-y-6">
    <div class="flex justify-between items-center">
        <div class="flex items-center gap-2">
            <Button href="/clients" color="light" class="p-2">
                <ChevronLeftOutline class="h-5 w-5" />
            </Button>
            <Heading tag="h3" class="text-primary-500">Client Details</Heading>
        </div>
        
        <Button href="/clients/{client.id_client}/edit" color="blue">
            <PenOutline class="mr-2 h-4 w-4" />Edit Client
        </Button>
    </div>

    <Card padding="md" size="xl">
        <div class="space-y-6">
            <!-- Client Header -->
            <div class="flex justify-between items-start border-b border-gray-700 pb-4">
                <div>
                    <Heading tag="h3" class="mb-1">{client.nom_complet}</Heading>
                    <p class="text-gray-400 text-sm">Client ID: {client.id_client}</p>
                </div>
                <Badge color={getSourceBadgeColor(client.source_system)}>
                    {client.source_system}
                </Badge>
            </div>
            
            <!-- Client Details -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-3">
                    <div>
                        <p class="text-gray-400 text-sm">Email Address</p>
                        <p>{client.email_contact || 'N/A'}</p>
                    </div>
                    
                    <div>
                        <p class="text-gray-400 text-sm">Phone Number</p>
                        <p>{client.numero_telephone || 'N/A'}</p>
                    </div>
                </div>
                
                <div>
                    <p class="text-gray-400 text-sm">Address</p>
                    <p>{client.adresse || 'N/A'}</p>
                </div>
            </div>
            
            <!-- Client Orders -->
            {#if orders.length > 0}
                <div class="pt-4 border-t border-gray-700">
                    <Heading tag="h4" customSize="text-xl font-semibold mb-4">Recent Orders</Heading>
                    
                    <Table striped={true}>
                        <TableHead>
                            <TableHeadCell>Order ID</TableHeadCell>
                            <TableHeadCell>Date</TableHeadCell>
                            <TableHeadCell>Amount</TableHeadCell>
                            <TableHeadCell>Status</TableHeadCell>
                            <TableHeadCell>Payment</TableHeadCell>
                        </TableHead>
                        <TableBody>
                            {#each orders as order}
                                <TableBodyRow>
                                    <TableBodyCell>
                                        <a href="/orders/{order.id_commande}" class="text-blue-500 hover:underline">
                                            {order.id_commande}
                                        </a>
                                    </TableBodyCell>
                                    <TableBodyCell>{formatDate(order.date_commande)}</TableBodyCell>
                                    <TableBodyCell>{formatPrice(order.montant)}</TableBodyCell>
                                    <TableBodyCell>
                                        <Badge color={getOrderStatusColor(order.statut)}>{order.statut}</Badge>
                                    </TableBodyCell>
                                    <TableBodyCell>{order.mode_paiement || 'N/A'}</TableBodyCell>
                                </TableBodyRow>
                            {/each}
                        </TableBody>
                    </Table>
                </div>
            {:else}
                <div class="pt-4 border-t border-gray-700">
                    <p class="text-gray-400 italic">No orders found for this client.</p>
                </div>
            {/if}
        </div>
    </Card>
</div>