"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiteSocApi = void 0;
class LiteSocApi {
    name = 'liteSocApi';
    displayName = 'LiteSOC API';
    documentationUrl = 'https://www.litesoc.io/docs/api';
    icon = {
        light: 'file:LiteSoc.svg',
        dark: 'file:LiteSoc.svg',
    };
    httpRequestNode = {
        name: 'LiteSOC',
        docsUrl: 'https://www.litesoc.io/docs/api/',
        apiBaseUrlPlaceholder: 'https://api.litesoc.io/',
    };
    properties = [
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            required: true,
            description: 'Your LiteSOC API key. Find it in your LiteSOC dashboard under Settings → API Keys.',
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                'X-API-Key': '={{$credentials.apiKey}}',
            },
        },
    };
    test = {
        request: {
            baseURL: 'https://api.litesoc.io',
            url: '/health',
            method: 'GET',
        },
    };
}
exports.LiteSocApi = LiteSocApi;
//# sourceMappingURL=LiteSocApi.credentials.js.map