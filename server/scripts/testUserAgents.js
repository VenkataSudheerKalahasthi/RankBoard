const axios = require('axios');

async function testUserAgents() {
  const handles = ['saipujeet', 'tarunkumarkv0j4', 'venkatasudheerkalahasthi'];
  const uas = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Googlebot/2.1 (+http://www.google.com/bot.html)'
  ];

  for (const ua of uas) {
    try {
      const res = await axios.get('https://www.geeksforgeeks.org/user/saipujeet/', {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 10000
      });
      console.log(`UA: ${ua.slice(0, 30)}... -> Status: ${res.status}, Length: ${res.data.length}, Has 'Saipujeet' or 'saipujeet': ${res.data.toLowerCase().includes('saipujeet')}, Has 'School': ${res.data.includes('School')}`);
    } catch (e) {
      console.log(`UA error:`, e.message);
    }
  }
}

testUserAgents();
