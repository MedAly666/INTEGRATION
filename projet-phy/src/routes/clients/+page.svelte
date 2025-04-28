<script lang="ts">
  import { onMount } from 'svelte';
  import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Search, Heading, Badge, Button, Dropdown, DropdownItem } from 'flowbite-svelte';
  import { SearchOutline, ArrowDownOutline, FilterOutline } from 'flowbite-svelte-icons';
  
  let searchTerm = '';
  let selectedSource = 'all';
  
  // Mock data - would be fetched from database in production
  let clients = [
    { client_id: 'SQL_1', client_name: 'Jean Dupont', address: '15 Rue de la Paix, Paris', email: 'jean.dupont@example.com', phone: '+33 1 23 45 67 89', source_system: 'SQL' },
    { client_id: 'NEO_5', client_name: 'Marie Martin', address: '8 Avenue Victor Hugo, Lyon', email: 'marie.m@example.com', phone: '+33 6 12 34 56 78', source_system: 'NEO4J' },
    { client_id: 'XML_12', client_name: 'Pierre Leroy', address: null, email: 'p.leroy@example.com', phone: '+33 7 89 01 23 45', source_system: 'XML' },
    // Add more mock data as needed
  ];
  
  $: filteredClients = clients.filter(client => {
    const matchesSearch = searchTerm === '' || 
      client.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSource = selectedSource === 'all' || client.source_system === selectedSource;
    
    return matchesSearch && matchesSource;
  });
  
  onMount(() => {
    // In a real app, you would fetch data here:
    // fetch('/api/clients').then(r => r.json()).then(data => clients = data);
  });
  
  function getBadgeColor(source: string) {
    switch (source) {
      case 'SQL': return 'blue';
      case 'NEO4J': return 'green';
      case 'XML': return 'purple';
      default: return 'gray';
    }
  }
</script>

<div>
  <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
    <div>
      <Heading tag="h1" class="text-primary-500 mb-2">Clients</Heading>
      <p class="text-gray-300">View and manage all clients from integrated systems</p>
    </div>
    
    <div class="flex gap-2 mt-4 md:mt-0">
      <div class="relative">
        <Search bind:value={searchTerm} size="md" placeholder="Search clients...">
          <SearchOutline slot="left" class="w-4 h-4" />
        </Search>
      </div>
      
      <Button color="dark">
        <FilterOutline class="mr-2 h-5 w-5" />
        <span>Filter</span>
        <ArrowDownOutline class="ml-2 h-3 w-3" />
        <Dropdown>
          <DropdownItem on:click={() => selectedSource = 'all'}>All Sources</DropdownItem>
          <DropdownItem on:click={() => selectedSource = 'SQL'}>SQL Source</DropdownItem>
          <DropdownItem on:click={() => selectedSource = 'NEO4J'}>Neo4j Source</DropdownItem>
          <DropdownItem on:click={() => selectedSource = 'XML'}>XML Source</DropdownItem>
        </Dropdown>
      </Button>
    </div>
  </div>
  
  <Table striped={true} class="bg-gray-800 border-gray-700">
    <TableHead>
      <TableHeadCell>Client ID</TableHeadCell>
      <TableHeadCell>Name</TableHeadCell>
      <TableHeadCell>Address</TableHeadCell>
      <TableHeadCell>Email</TableHeadCell>
      <TableHeadCell>Phone</TableHeadCell>
      <TableHeadCell>Source</TableHeadCell>
    </TableHead>
    <TableBody>
      {#each filteredClients as client}
        <TableBodyRow>
          <TableBodyCell>{client.client_id}</TableBodyCell>
          <TableBodyCell>{client.client_name}</TableBodyCell>
          <TableBodyCell>{client.address || '—'}</TableBodyCell>
          <TableBodyCell>{client.email}</TableBodyCell>
          <TableBodyCell>{client.phone}</TableBodyCell>
          <TableBodyCell>
            <Badge color={getBadgeColor(client.source_system)}>{client.source_system}</Badge>
          </TableBodyCell>
        </TableBodyRow>
      {/each}
      
      {#if filteredClients.length === 0}
        <TableBodyRow>
          <TableBodyCell colspan="6" class="text-center py-4">No clients found</TableBodyCell>
        </TableBodyRow>
      {/if}
    </TableBody>
  </Table>
</div>