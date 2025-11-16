export default async function handler(req, res) {
    // Разрешаем CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { endpoint, method = 'GET', data = null } = req.body;

    const GITHUB_CONFIG = {
        owner: 'plehovlev2011-glitch',
        repo: 'BonusSystem',
        token: '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',
        dataFile: 'bonus_data.json'
    };

    try {
        const url = `https://api.github.com/${endpoint}`;
        const options = {
            method: method,
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.token}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Pepper-Bonus-System'
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        res.status(200).json(result);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: error.message });
    }
}
