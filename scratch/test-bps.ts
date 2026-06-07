import { fetchWithRetry } from '../scripts/config';

async function test() {
  const apiKey = '4d96fc223c418b9ea034fdf65df0d6e1';
  // Fetch var 2245 (IHK 2022=100)
  const ihk2245Url = `https://webapi.bps.go.id/v1/api/list/model/data/domain/0000/var/2245/th/124;125;126/key/${apiKey}`;
  console.log('\nFetching IHK 2022=100 (var 2245):', ihk2245Url);
  try {
    const res = await fetchWithRetry(ihk2245Url);
    const data = await res.json() as any;
    console.log('IHK 2245 Status:', data.status);
    if (data.status === 'OK') {
      console.log('IHK 2245 availability:', data['data-availability']);
      console.log('IHK 2245 vars:', JSON.stringify(data.var));
      console.log('IHK 2245 vervar (all):', JSON.stringify(data.vervar));
    } else {
      console.log('IHK 2245 API Response:', JSON.stringify(data).slice(0, 500));
    }
  } catch (err) {
    console.error('Error fetching IHK 2245:', err);
  }
}

test();
