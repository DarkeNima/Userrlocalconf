const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    
    const responseData = {
      "abhotupdate_cdn_url": "",
      "abhotupdate_check": "",
      "appstore_url": "http://www.freefiremobile.com/",
      "cdn_url": "http://139.162.54.41/", 
      "client_ip": "139.162.54.41",
      "code": 2,
      "is_server_open": true,
      "latest_release_version": "1.103.1",
      "remote_version": "1.103.1",
      // මෙන්න මේ පෝට් එක (10001) අනිවාර්යයෙන්ම තියෙන්න ඕනේ:
      "server_url": "http://139.162.54.41:10001/", 
      "ggp_url": "139.162.54.41:10001",
      "country_code": "IN",
      "is_firewall_open": false,
      "garena_hint": false,
      "garena_login": false
    };

    res.end(JSON.stringify(responseData));
});

const PORT = 80;
server.listen(PORT, () => {
    console.log(`Version API is running on port ${PORT}`);
});
