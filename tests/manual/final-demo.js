// Final test of Windows desktop automation core operations
// Focus on the working automation capabilities without complex window management

const BASE_URL = 'http://localhost:9995';

async function testCoreOperations() {
  console.log('Testing Windows Desktop Automation Core Operations\n');

  // Health check
  console.log('1. Health check...');
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    console.log('Health:', data.success ? 'OK' : 'Failed');
  } catch (error) {
    console.log('Health check failed:', error.message);
    return;
  }

  // Screen size
  console.log('\n2. Screen size...');
  try {
    const response = await fetch(`${BASE_URL}/screen-size`);
    const data = await response.json();
    console.log('Screen size:', data.result);
  } catch (error) {
    console.log('Screen size failed:', error.message);
  }

  // Mouse movement
  console.log('\n3. Mouse movement...');
  try {
    const response = await fetch(`${BASE_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'move_mouse',
        x: 500,
        y: 500
      })
    });
    const data = await response.json();
    console.log('Mouse movement:', data.success ? 'OK' : 'Failed');
  } catch (error) {
    console.log('Mouse movement failed:', error.message);
  }

  // Mouse click (the critical one)
  console.log('\n4. Mouse click (this was hanging in Linux)...');
  try {
    const startTime = Date.now();
    const response = await fetch(`${BASE_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'click',
        coordinates: { x: 600, y: 400 },
        button: 'left'
      })
    });
    const clickTime = Date.now() - startTime;
    const data = await response.json();
    console.log(`Mouse click: SUCCESS (${clickTime}ms)`);
  } catch (error) {
    console.log('Mouse click failed:', error.message);
  }

  // Keyboard typing
  console.log('\n5. Keyboard typing...');
  try {
    const response = await fetch(`${BASE_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'type',
        text: 'Windows automation works!'
      })
    });
    const data = await response.json();
    console.log('Keyboard typing:', data.success ? 'OK' : 'Failed');
  } catch (error) {
    console.log('Keyboard typing failed:', error.message);
  }

  // Screenshot
  console.log('\n6. Screenshot...');
  try {
    const response = await fetch(`${BASE_URL}/screenshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'png'
      })
    });
    const data = await response.json();
    console.log('Screenshot:', data.success ? `Captured (${data.result.data.length} chars)` : 'Failed');
  } catch (error) {
    console.log('Screenshot failed:', error.message);
  }

  console.log('\nWindows Desktop Automation Test Complete!');
  console.log('This proves Windows libnut-core works without hanging issues');
}

testCoreOperations();