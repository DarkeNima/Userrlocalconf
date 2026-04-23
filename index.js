const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    
    const responseData = {
      "code": 0,
      "message": "Success",
      // මෙන්න මේ MD5 ටික අනිවාර්යයෙන්ම ඕනේ OB53 වලට
      "md5": "7e94677df24a33519a49c4cfc85edf41",
      "pkg_md5": "99f1b4b2b23b52e79d16c93a851d1b35",
      "is_server_open": true,
      "latest_release_version": "1.103.1", 
      "current_release_version": "1.103.1",
      "remote_version": "1.103.1",
      "server_url": "http://139.162.54.41:10001", 
      "cdn_url": "http://client.common.freefiremobile.com", // Official CDN එක දීම වඩාත් ආරක්ෂිතයි
      "client_ip": req.connection.remoteAddress, // මේකෙන් user ගේ ඇත්තම IP එක ගන්නවා
      "ggp_url": "139.162.54.41:10001",
      "country_code": "IN",
      "is_firewall_open": false,
      "maintenance": false
    };

    res.end(JSON.stringify(responseData));
});

const PORT = 80;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Version API (Port 80) is now Official! Running on port ${PORT}`);
});
