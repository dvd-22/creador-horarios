exports.handler = async (event, context) => {
  console.log('Debug test function started');
  
  try {
    // Basic environment check
    const envInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memoryUsage: process.memoryUsage(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        AWS_REGION: process.env.AWS_REGION,
        NETLIFY: process.env.NETLIFY,
        NETLIFY_DEV: process.env.NETLIFY_DEV
      }
    };

    console.log('Environment info:', envInfo);

    // Test basic dependencies
    let dependencyTest = {};
    
    try {
      const axios = require('axios');
      dependencyTest.axios = 'OK';
      console.log('Axios loaded successfully');
    } catch (error) {
      dependencyTest.axios = `ERROR: ${error.message}`;
      console.error('Axios error:', error);
    }

    try {
      const NodeCache = require('node-cache');
      const testCache = new NodeCache();
      testCache.set('test', 'value');
      dependencyTest.nodeCache = testCache.get('test') === 'value' ? 'OK' : 'FAIL';
      console.log('NodeCache test passed');
    } catch (error) {
      dependencyTest.nodeCache = `ERROR: ${error.message}`;
      console.error('NodeCache error:', error);
    }

    // Test a simple HTTP request
    let httpTest = {};
    try {
      const axios = require('axios');
      const response = await axios.get('https://httpbin.org/json', {
        timeout: 5000,
        headers: {
          'User-Agent': 'CreadorHorarios-Debug/1.0'
        }
      });
      httpTest.status = response.status;
      httpTest.data = 'received';
      console.log('HTTP test successful');
    } catch (error) {
      httpTest.error = error.message;
      httpTest.code = error.code;
      console.error('HTTP test failed:', error);
    }

    const result = {
      status: 'success',
      timestamp: new Date().toISOString(),
      environment: envInfo,
      dependencies: dependencyTest,
      httpTest: httpTest
    };

    console.log('Debug test completed successfully');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify(result, null, 2)
    };

  } catch (error) {
    console.error('Debug test function error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        status: 'error',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }, null, 2)
    };
  }
};
