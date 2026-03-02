import type { INodeProperties } from 'n8n-workflow';

export const alertOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: {
			show: {
				resource: ['alert'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a specific alert. Returns: id (UUID), alert_type, severity (critical/high/medium/low), status, title, description, source_ip, actor_id, trigger_event_id (UUID of triggering event), forensics (network/location data for Pro+ tiers, null for Free), created_at, updated_at, metadata. Severity is auto-assigned by LiteSOC.',
				action: 'Get an alert',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many alerts. Each alert includes: id (UUID), trigger_event_id (UUID of triggering event), forensics object (network: is_vpn, is_tor, is_proxy, is_datacenter, asn, threat_score; location: city, country_code, region, latitude, longitude, timezone) for Pro+ tiers. Severity (critical/high/medium/low) is auto-assigned by LiteSOC.',
				action: 'Get many alerts',
			},
			{
				name: 'Resolve',
				value: 'resolve',
				description: 'Mark an alert as resolved',
				action: 'Resolve an alert',
			},
			{
				name: 'Mark Safe',
				value: 'markSafe',
				description: 'Mark an alert as safe (false positive)',
				action: 'Mark alert as safe',
			},
		],
		default: 'getAll',
	},
];

export const alertFields: INodeProperties[] = [
	// ----------------------------------
	//         alert:get
	// ----------------------------------
	{
		displayName: 'Alert ID',
		name: 'alertId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['alert'],
				operation: ['get'],
			},
		},
		default: '',
		placeholder: '550e8400-e29b-41d4-a716-446655440000',
		description: 'The UUID of the alert to retrieve',
	},

	// ----------------------------------
	//         alert:getAll
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['alert'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['alert'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return. Default: 100, Max: 500 (Enterprise only, Pro max: 200)',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['alert'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Alert Type',
				name: 'alertType',
				type: 'options',
				options: [
					{
						name: 'Brute Force Attack',
						value: 'brute_force_attack',
						description: 'Multiple failed login attempts detected',
					},
					{
						name: 'Data Exfiltration',
						value: 'data_exfiltration',
						description: 'Unusual data export or access pattern',
					},
					{
						name: 'Geo Anomaly',
						value: 'geo_anomaly',
						description: 'Unusual geographic access pattern',
					},
					{
						name: 'Impossible Travel',
						value: 'impossible_travel',
						description: 'Login from geographically impossible locations',
					},
					{
						name: 'New Device',
						value: 'new_device',
						description: 'Login from an unrecognized device',
					},
					{
						name: 'Privilege Escalation',
						value: 'privilege_escalation',
						description: 'Unauthorized privilege escalation detected',
					},
					{
						name: 'Rate Limit Exceeded',
						value: 'rate_limit_exceeded',
						description: 'API rate limit was exceeded',
					},
					{
						name: 'Suspicious Activity',
						value: 'suspicious_activity',
						description: 'General suspicious activity detected',
					},
				],
				default: '',
				description: 'Filter by alert type',
			},
			{
				displayName: 'Severity',
				name: 'severity',
				type: 'options',
				options: [
					{ name: 'Low', value: 'low', description: 'Low priority alerts' },
					{ name: 'Medium', value: 'medium', description: 'Medium priority alerts' },
					{ name: 'High', value: 'high', description: 'High priority alerts requiring attention' },
					{ name: 'Critical', value: 'critical', description: 'Critical alerts requiring immediate action' },
				],
				default: '',
				description: 'Filter by severity level',
				hint: 'Each returned alert includes a "severity" field. Use {{ $json.severity }} in IF/Switch nodes to route by severity.',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Open', value: 'open' },
					{ name: 'Acknowledged', value: 'acknowledged' },
					{ name: 'Resolved', value: 'resolved' },
					{ name: 'Dismissed (Safe)', value: 'dismissed' },
				],
				default: '',
				description: 'Filter by alert status',
			},
		],
	},

	// ----------------------------------
	//         alert:resolve
	// ----------------------------------
	{
		displayName: 'Alert ID',
		name: 'alertId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['alert'],
				operation: ['resolve'],
			},
		},
		default: '',
		placeholder: '550e8400-e29b-41d4-a716-446655440000',
		description: 'The UUID of the alert to resolve',
	},
	{
		displayName: 'Resolution Type',
		name: 'resolutionType',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['alert'],
				operation: ['resolve'],
			},
		},
		options: [
			{
				name: 'Blocked IP',
				value: 'blocked_ip',
				description: 'The malicious IP address has been blocked',
			},
			{
				name: 'Contacted User',
				value: 'contacted_user',
				description: 'The user has been contacted about the activity',
			},
			{
				name: 'False Positive',
				value: 'false_positive',
				description: 'Alert was triggered incorrectly',
			},
			{
				name: 'Other',
				value: 'other',
				description: 'Other resolution action taken',
			},
			{
				name: 'Reset Password',
				value: 'reset_password',
				description: 'User password was reset as a security measure',
			},
		],
		default: 'false_positive',
		description: 'How the alert was resolved',
	},
	{
		displayName: 'Internal Notes',
		name: 'internalNotes',
		type: 'string',
		typeOptions: {
			rows: 4,
			maxLength: 2000,
		},
		displayOptions: {
			show: {
				resource: ['alert'],
				operation: ['resolve'],
			},
		},
		default: '',
		description: 'Internal notes about the resolution (max 2000 characters, not visible to end users)',
	},

	// ----------------------------------
	//         alert:markSafe
	// ----------------------------------
	{
		displayName: 'Alert ID',
		name: 'alertId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['alert'],
				operation: ['markSafe'],
			},
		},
		default: '',
		placeholder: '550e8400-e29b-41d4-a716-446655440000',
		description: 'The UUID of the alert to mark as safe',
	},
	{
		displayName: 'Internal Notes',
		name: 'internalNotes',
		type: 'string',
		typeOptions: {
			rows: 4,
			maxLength: 2000,
		},
		displayOptions: {
			show: {
				resource: ['alert'],
				operation: ['markSafe'],
			},
		},
		default: '',
		description: 'Reason for marking this alert as safe (max 2000 characters)',
	},
];
