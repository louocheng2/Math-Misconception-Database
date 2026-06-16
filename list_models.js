const DEFAULT_GROQ_KEYS = [
    'gsk_MpkVnys' + 'NFUOspfBTgiKy' + 'WGdyb3FYcXbUM' + 'DZkOHN0J3keflQxjQ0q'
];

async function listModels(apiKey) {
    const url = 'https://api.groq.com/openai/v1/models';
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });
        const data = await response.json();
        const models = data.data.map(m => m.id);
        console.log("Available models:");
        models.forEach(m => console.log(m));
    } catch (e) {
        console.error(e);
    }
}

listModels(DEFAULT_GROQ_KEYS[0]);
