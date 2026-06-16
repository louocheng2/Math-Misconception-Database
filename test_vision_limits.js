const DEFAULT_GROQ_KEYS = [
    'gsk_MpkVnys' + 'NFUOspfBTgiKy' + 'WGdyb3FYcXbUM' + 'DZkOHN0J3keflQxjQ0q',
    'gsk_a7tg5MD' + 'ldNe5EhGlxyi7' + 'WGdyb3FY87MZ7' + 'OBwgtpPYwmWAnmc5o3s'
];

async function testVision(model, apiKey) {
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    
    // A 10x10 dummy image generated correctly using canvas or valid base64
    // 10x10 red square
    const dummyImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FAA3EA1vMDNnRAAAAAElFTkSuQmCC';

    const payload = {
        model: model,
        messages: [{
            role: 'user',
            content: [
                { type: 'text', text: "Hello" },
                { type: 'image_url', image_url: { url: dummyImage } }
            ]
        }],
        temperature: 0.1
    };
    try {
        console.log(`Testing model: ${model}...`);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });
        const status = response.status;
        const text = await response.text();
        console.log(`Status = ${status}`);
        console.log(`Response: ${text.substring(0, 300)}`);
    } catch (e) {
        console.error(`Error:`, e);
    }
}

async function run() {
    await testVision('llama-3.2-11b-vision', DEFAULT_GROQ_KEYS[0]);
    await testVision('llama-3.2-90b-vision', DEFAULT_GROQ_KEYS[0]);
    await testVision('meta-llama/llama-4-scout-17b-16e-instruct', DEFAULT_GROQ_KEYS[0]);
}

run();
