const axios = require('axios');
const fs = require('fs');

async function inspectGfgHtml(handle) {
  const url = `https://www.geeksforgeeks.org/user/${encodeURIComponent(handle)}/`;
  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    timeout: 12000,
  });

  const html = res.data;

  // Let's search for script tags with JSON
  const scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
  console.log(`Total script tags: ${scripts.length}`);

  for (let i = 0; i < scripts.length; i++) {
    const s = scripts[i];
    if (s.includes('total_problems_solved') || s.includes('coding_score') || s.includes('score') || s.includes('practice') || s.includes('institution')) {
      console.log(`Script ${i} matches:`, s.substring(0, 300));
    }
  }

  // Also check if GFG has public API endpoint!
  // e.g. https://auth.geeksforgeeks.org/api/user/profile?handle=... or similar
  try {
    const apiRes = await axios.get(`https://practiceapi.geeksforgeeks.org/api/vr/problems/user/solved/all/${handle}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      timeout: 8000,
    });
    console.log('Practice API result:', apiRes.data);
  } catch (e) {
    console.log('Practice API error:', e.message);
  }

  // Check if GFG user profile API exists
  try {
    const apiRes2 = await axios.get(`https://geeksforgeeks-profile-api.vercel.app/${handle}`, { timeout: 5000 });
    console.log('Public mirror API result:', apiRes2.data);
  } catch (e) {
    console.log('Public mirror API error:', e.message);
  }
}

inspectGfgHtml('tarunkumarkv0j4');
