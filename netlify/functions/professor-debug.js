const axios = require('axios');

exports.handler = async (event, context) => {
  console.log('Professor debug test started');
  
  try {
    // Test with just one professor
    const testProfessor = 'JOSÉ LUIS ABREU LEON';
    
    console.log(`Testing with professor: ${testProfessor}`);
    
    const response = await axios.get('https://www.misprofesores.com/search/maestros', {
      params: {
        buscar: testProfessor,
        universidad: 'UNAM'
      },
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    console.log('API Response status:', response.status);
    console.log('API Response headers:', response.headers);
    console.log('API Response data length:', response.data?.length || 0);

    const result = {
      status: 'success',
      professorTested: testProfessor,
      apiStatus: response.status,
      responseSize: response.data?.length || 0,
      hasData: !!response.data,
      timestamp: new Date().toISOString()
    };

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
    console.error('Professor debug test error:', error);
    
    const errorDetails = {
      status: 'error',
      message: error.message,
      code: error.code,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        headers: error.response.headers
      } : null,
      timestamp: new Date().toISOString()
    };

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(errorDetails, null, 2)
    };
  }
};
