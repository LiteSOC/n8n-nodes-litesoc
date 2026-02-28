import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class LiteSocApi implements ICredentialType {
	name = 'liteSocApi';

	displayName = 'LiteSOC API';

	documentationUrl = 'https://www.litesoc.io/docs/api';

	icon = {
		light: 'file:LiteSoc.svg',
		dark: 'file:LiteSoc.svg',
	} as const;

	httpRequestNode = {
		name: 'LiteSOC',
		docsUrl: 'https://www.litesoc.io/docs/api/',
		apiBaseUrlPlaceholder: 'https://api.litesoc.io/',
	};

	properties: INodeProperties[] = [
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

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-API-Key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.litesoc.io',
			url: '/health',
			method: 'GET',
		},
	};
}
