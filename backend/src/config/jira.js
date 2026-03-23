const axios = require('axios');

const createJiraClient = (domain, email, token) => {
    const auth = Buffer.from(`${email}:${token}`).toString('base64');

    return axios.create({
        baseURL: `https://${domain}`,
        headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        timeout: 10000
    });
};

module.exports = { createJiraClient };