<script lang="ts">
    import { Heading } from 'flowbite-svelte';
    import DataTable from '$lib/components/DataTable.svelte';
    import type { Client } from "$lib/types/database";
    import type { PageProps } from './$types';
    import { goto } from '$app/navigation';

	let { data }: PageProps = $props();
  // State
  let clients = $state(data.clients as Client[]);
  let loading = $state(data.loading as boolean);

  // Column configuration
  const columns = [
    { key: 'id_client', label: 'Client ID', sortable: true },
    { key: 'nom_complet', label: 'Name', sortable: true },
    { key: 'adresse', label: 'Address', sortable: true },
    { key: 'email_contact', label: 'Email', sortable: true },
    { key: 'numero_telephone', label: 'Phone', sortable: true },
    { key: 'source_system', label: 'Source', sortable: true, badge: 'source' }
  ];

  // Badge color configuration
  const badgeColors = {
    source: {
      'SQL': 'blue',
      'NEO4J': 'green',
      'XML': 'purple'
    }
  };

  
  // Handle client row click
  function handleClientClick(event: CustomEvent<Client>) {
    const client = event.detail;
    goto(`/clients/${client.id_client}`);
  }
</script>

<div class="space-y-6">
  <div>
    <Heading tag="h1" class="text-primary-500 mb-2">Clients</Heading>
    <p class="text-gray-300">View and manage all clients from integrated systems</p>
  </div>
  
  <DataTable 
    data={clients}
    columns={columns}
    loading={loading}
    searchable={true}
    paginated={true}
    pageSize={15}
    emptyMessage="No clients found"
    badgeColors={badgeColors}
    on:rowClick={handleClientClick}
    title="Client List"
    striped={true}
    hover={true}
  />
</div>