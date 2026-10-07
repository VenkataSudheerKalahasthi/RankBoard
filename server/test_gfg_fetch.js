const { fetchGFGProfile } = require('./src/services/platforms/gfgService');

async function test() {
  const res = await fetchGFGProfile('venkatasudheerkalahasthi');
  console.log('GFG Profile Result:', JSON.stringify(res, null, 2));
}

test();
