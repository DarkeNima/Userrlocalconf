// check.js
const b64Data = "CNmE7440EgJTRxoCU0ciAlNHKgRsaXZlQpUGZXlKaGJHY2lPaUpJVXpJMU5pSXNJbk4yY2lJNklqRWlMQ0owZVhBaU9pSktWMVFpZlEuZXlKaFkyTnZkVzUwWDJsa0lqb3hNems0T1RneU16QTJOU3dpYm1samEyNWhiV1VpT2lKbU5GTkNkVTVwVFhjMmNrazRkWFZJTUU5UldFRkJSMGhxWldzOUlpd2libTkwYVY5eVpXZHBiMjRpT2lKVFJ5SXNJbXh2WTJ0ZmNtVm5hVzl1SWpvaVUwY2lMQ0psZUhSbGNtNWhiRjlwWkNJNkltRTRNVFpqTnpabFlqWTROemczWXpneVl6YzFaamt4TURJeFlURTJPR1JsSWl3aVpYaDBaWEp1WVd4ZmRIbHdaU0k2TVRFc0luQnNZWFJmYVdRaU9qRXNJbU5zYVdWdWRGOTJaWEp6YVc5dUlqb2lNUzR4TWpNdU9DSXNJbVZ0ZFd4aGRHOXlYM05qYjNKbElqb3dMQ0pwYzE5bGJYVnNZWFJ2Y2lJNlptRnNjMlVzSW1OdmRXNTBjbmxmWTI5a1pTSTZJbE5ISWl3aVpYaDBaWEp1WVd4ZmRXbGtJam94TmpZNU1EQXdNREUwTXpBNExDSnlaV2RmWVhaaGRHRnlJam94TURJd01EQXdNRGNzSW5OdmRYSmpaU0k2TUN3aWJHOWphMTl5WldkcGIyNWZkR2x0WlNJNk1UYzJORFF4TVRZNU5Td2lZMnhwWlc1MFgzUjVjR1VpT2pJc0luTnBaMjVoZEhWeVpWOXRaRFVpT2lJM05DIXNJaWl6WVd4bGVIWjFaWElzSW5WemFXNW5YM1psY25OcGIyNGlPakVzSW5KbGJHVmhjMlZmWTJoaGJtNWxiQ0k2SW1GdVpISnZhV1FpTENKeVpXeGxZWE5sWDNabGNuTnBiMjRpT2lKUFFqVXpJaXdpWlhod0lqb3hOemMzTXprNU1EZzRmUS5vUGtfOV9qSUNpcnQ2bEtmRXFYUXgwSExDYVRkajEzRkgwcDJYSkNaOWRrSA==";

const buffer = Buffer.from(b64Data, 'base64');
const str = buffer.toString('utf8');

// JWT එකේ Payload එක විතරක් කපාගන්නවා
const jwtPart = str.match(/eyJ[a-zA-Z0-9\-_]+\.eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/);

if (jwtPart) {
    const payloadB64 = jwtPart[0].split('.')[1];
    const payload = Buffer.from(payloadB64, 'base64url').toString('utf8');
    console.log("=== DECODED PAYLOAD ===");
    console.log(JSON.stringify(JSON.parse(payload), null, 4));
} else {
    console.log("Could not find a valid JWT in the data.");
}
