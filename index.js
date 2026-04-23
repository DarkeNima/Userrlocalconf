const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    
    const responseData = {
      "code": 0, // DeepSeek කිව්වා වගේ 0 කරා
      "is_server_open": true,
      "latest_release_version": "1.104.1", 
      "remote_version": "1.104.1",
      "server_url": "http://139.162.54.41:10001/", 
      "cdn_url": "http://139.162.54.41/",
      "client_ip": "139.162.54.41",
      "ggp_url": "139.162.54.41:10001",
      "country_code": "IN",
      "is_firewall_open": false,
      "garena_hint": false,
      "garena_login": false
    };

    res.end(JSON.stringify(responseData));
});

const PORT = 80;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Version API running on port ${PORT}`);
});
