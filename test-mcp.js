const { spawn } = require('child_process');

// Start the MCP server
const server = spawn('npx', ['-y', '@modelcontextprotocol/server-puppeteer'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Send an MCP initialization message
const initMessage = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: {
      name: "test-client",
      version: "1.0.0"
    }
  }
};

server.stdout.on('data', (data) => {
  console.log('Server response:', data.toString());
});

server.stderr.on('data', (data) => {
  console.log('Server error:', data.toString());
});

server.on('error', (error) => {
  console.log('Process error:', error);
});

// Send the message
server.stdin.write(JSON.stringify(initMessage) + '\n');

// Clean up after 3 seconds
setTimeout(() => {
  server.kill();
  console.log('Test completed');
}, 3000);
