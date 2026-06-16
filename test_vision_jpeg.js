const fs = require('fs');
const DEFAULT_GROQ_KEYS = [
    'gsk_MpkVnys' + 'NFUOspfBTgiKy' + 'WGdyb3FYcXbUM' + 'DZkOHN0J3keflQxjQ0q'
];

async function testVision(model, apiKey) {
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    
    // valid 10x10 JPEG white square
    const dummyImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/4QAiRXhpZgAATU0AKgAAAAgAAQESAAMAAAABAAEAAAAAAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAAKAAoDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q==';

    const payload = {
        model: model,
        messages: [{
            role: 'user',
            content: [
                { type: 'text', text: "What is in this image?" },
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
    const models = [
        "llama-3.3-70b-versatile",
        "qwen/qwen3.6-27b",
        "meta-llama/llama-4-scout-17b-16e-instruct",
        "openai/gpt-oss-120b"
    ];
    for (const m of models) {
        await testVision(m, DEFAULT_GROQ_KEYS[0]);
    }
}

run();
