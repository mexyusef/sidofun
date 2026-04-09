// Test client for Windows desktop service
const BASE_URL = 'http://localhost:9991';

console.log('Testing Windows Desktop Service...\n');

// Test 1: Health check
async function testHealth() {
  console.log('1. Testing health check...');
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    console.log('Health check:', data);
    return data.success;
  } catch (error) {
    console.log('Health check failed:', error.message);
    return false;
  }
}

// Test 2: Screen size
async function testScreenSize() {
  console.log('\n2. Testing screen size...');
  try {
    const response = await fetch(`${BASE_URL}/screen-size`);
    const data = await response.json();
    console.log('Screen size:', data.result);
    return data.success;
  } catch (error) {
    console.log('Screen size failed:', error.message);
    return false;
  }
}

// Test 3: Mouse position
async function testMousePosition() {
  console.log('\n3. Testing mouse position...');
  try {
    const response = await fetch(`${BASE_URL}/mouse-position`);
    const data = await response.json();
    console.log('Mouse position:', data.result);
    return data.success;
  } catch (error) {
    console.log('Mouse position failed:', error.message);
    return false;
  }
}

// Test 4: Mouse movement (this should work)
async function testMouseMove() {
  console.log('\n4. Testing mouse movement...');
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
    console.log('Mouse movement:', data.result);
    return data.success;
  } catch (error) {
    console.log('Mouse movement failed:', error.message);
    return false;
  }
}

// Test 5: Mouse click (THE CRITICAL TEST - this hangs in Linux!)
async function testMouseClick() {
  console.log('\n5. Testing mouse click (the problematic operation)...');
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
    console.log(`✅ Mouse click: SUCCESS (${clickTime}ms) -`, data.result);
    return data.success;
  } catch (error) {
    console.log('❌ Mouse click failed:', error.message);
    return false;
  }
}

// Test 6: Mouse drag (also problematic in Linux!)
async function testMouseDrag() {
  console.log('\n6. Testing mouse drag (another problematic operation)...');
  try {
    const startTime = Date.now();
    const response = await fetch(`${BASE_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'drag_mouse',
        path: [
          { x: 100, y: 100 },
          { x: 200, y: 200 },
          { x: 300, y: 150 }
        ],
        button: 'left'
      })
    });
    const dragTime = Date.now() - startTime;
    const data = await response.json();
    console.log(`✅ Mouse drag: SUCCESS (${dragTime}ms) -`, data.result);
    return data.success;
  } catch (error) {
    console.log('❌ Mouse drag failed:', error.message);
    return false;
  }
}

// Test 7: Scroll (problematic in Linux!)
async function testScroll() {
  console.log('\n7. Testing scroll (problematic in Linux)...');
  try {
    const startTime = Date.now();
    const response = await fetch(`${BASE_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'scroll',
        direction: 'down',
        count: 3
      })
    });
    const scrollTime = Date.now() - startTime;
    const data = await response.json();
    console.log(`✅ Scroll: SUCCESS (${scrollTime}ms) -`, data.result);
    return data.success;
  } catch (error) {
    console.log('❌ Scroll failed:', error.message);
    return false;
  }
}

// Test 8: Keyboard typing
async function testTyping() {
  console.log('\n8. Testing keyboard typing...');
  try {
    const response = await fetch(`${BASE_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'type',
        text: 'Hello from Windows nut.js!'
      })
    });
    const data = await response.json();
    console.log('Typing:', data.result);
    return data.success;
  } catch (error) {
    console.log('Typing failed:', error.message);
    return false;
  }
}

// Test 9: Screenshot
async function testScreenshot() {
  console.log('\n9. Testing screenshot...');
  try {
    const response = await fetch(`${BASE_URL}/screenshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'png'
      })
    });
    const data = await response.json();
    console.log('Screenshot captured, size:', data.result.data.length, 'characters');
    return data.success;
  } catch (error) {
    console.log('Screenshot failed:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('Starting Windows Desktop Service Tests...\n');

  const tests = [
    { name: 'Health Check', fn: testHealth },
    { name: 'Screen Size', fn: testScreenSize },
    { name: 'Mouse Position', fn: testMousePosition },
    { name: 'Mouse Movement', fn: testMouseMove },
    { name: 'Mouse Click', fn: testMouseClick },
    { name: 'Mouse Drag', fn: testMouseDrag },
    { name: 'Scroll', fn: testScroll },
    { name: 'Typing', fn: testTyping },
    { name: 'Screenshot', fn: testScreenshot }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const success = await test.fn();
      if (success) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`${test.name} threw error:`, error.message);
      failed++;
    }
  }

  console.log('\nTest Results:');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${Math.round((passed / tests.length) * 100)}%`);

  if (failed === 0) {
    console.log('\nALL TESTS PASSED! Windows libnut-core works perfectly!');
    console.log('This proves the hanging issue is specific to Linux X11, not libnut-core itself.');
  } else {
    console.log('\nSome tests failed. Check the error messages above.');
  }
}

// Run tests
runAllTests().catch(console.error);