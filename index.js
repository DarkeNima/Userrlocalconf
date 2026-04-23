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
      "is_server_
