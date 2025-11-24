const API_KEY = 'AIzaSyA8pKZS_ba5D-GJOfNxBGVVXIOB2IXEp_0';

async function listModels() {
    console.log('Fetching available models for key:', API_KEY.substring(0, 10) + '...');
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            console.error('❌ API Error:', data.error?.message || response.statusText);
            return;
        }

        if (data.models) {
            console.log('\n✅ Available Models:');
            data.models.forEach(model => {
                console.log(`- ${model.name.replace('models/', '')} (${model.version})`);
                console.log(`  Supported methods: ${model.supportedGenerationMethods.join(', ')}`);
            });
        } else {
            console.log('No models found.');
        }

    } catch (error) {
        console.error('❌ Network Error:', error.message);
    }
}

listModels();
