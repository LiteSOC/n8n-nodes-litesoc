import type { INodeProperties } from 'n8n-workflow';

export const eventOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: {
			show: {
				resource: ['event'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Track a security event. Note: Severity is automatically assigned by LiteSOC based on the event type and cannot be set manually.',
				action: 'Track a security event',
			},
			{
				name: 'Get',
				value: 'get',
				description:
					'Fetches details of a single event. Returns: id, event_name, severity (critical/warning/info), actor_id, ip_address, metadata, created_at. Severity is auto-assigned by LiteSOC. Note: Free tier users can only fetch events from the last 7 days and enrichment data (VPN/Maps) will be hidden.',
				action: 'Get a security event',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many security events. Each event includes severity (critical/warning/info) auto-assigned by LiteSOC based on event type, enabling easy filtering in IF/Switch nodes.',
				action: 'Get many security events',
			},
		],
		default: 'create',
	},
];

export const eventFields: INodeProperties[] = [
	// ----------------------------------
	//         event:create
	// ----------------------------------
	{
		displayName: 'Event Type',
		name: 'eventType',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['create'],
			},
		},
		hint: 'Severity is automatically assigned by LiteSOC based on the event type. Critical: privilege_escalation, bulk_delete, suspicious_activity, brute_force. Warning: login_failed, mfa_disabled, user_deleted. Info: all other events.',
		options: [
			// Authentication Events
			{
				name: 'Auth: Login Success',
				value: 'auth.login_success',
				description: 'User successfully logged in',
			},
			{
				name: 'Auth: Login Failed',
				value: 'auth.login_failed',
				description: 'Failed login attempt',
			},
			{
				name: 'Auth: Logout',
				value: 'auth.logout',
				description: 'User logged out',
			},
			{
				name: 'Auth: Password Reset',
				value: 'auth.password_reset',
				description: 'Password was reset',
			},
			{
				name: 'Auth: MFA Enabled',
				value: 'auth.mfa_enabled',
				description: 'Multi-factor authentication enabled',
			},
			{
				name: 'Auth: MFA Disabled',
				value: 'auth.mfa_disabled',
				description: 'Multi-factor authentication disabled',
			},
			{
				name: 'Auth: Session Expired',
				value: 'auth.session_expired',
				description: 'User session expired',
			},
			{
				name: 'Auth: Token Refreshed',
				value: 'auth.token_refreshed',
				description: 'Authentication token was refreshed',
			},
			// Authorization Events
			{
				name: 'Authz: Access Denied',
				value: 'authz.access_denied',
				description: 'Access to resource was denied',
			},
			{
				name: 'Authz: Role Changed',
				value: 'authz.role_changed',
				description: 'User role was changed',
			},
			{
				name: 'Authz: Permission Granted',
				value: 'authz.permission_granted',
				description: 'Permission was granted',
			},
			{
				name: 'Authz: Permission Revoked',
				value: 'authz.permission_revoked',
				description: 'Permission was revoked',
			},
			// Admin Events
			{
				name: 'Admin: User Created',
				value: 'admin.user_created',
				description: 'New user was created',
			},
			{
				name: 'Admin: User Deleted',
				value: 'admin.user_deleted',
				description: 'User was deleted',
			},
			{
				name: 'Admin: User Suspended',
				value: 'admin.user_suspended',
				description: 'User was suspended',
			},
			{
				name: 'Admin: Privilege Escalation',
				value: 'admin.privilege_escalation',
				description: 'Privilege escalation detected',
			},
			{
				name: 'Admin: Settings Changed',
				value: 'admin.settings_changed',
				description: 'System settings were changed',
			},
			{
				name: 'Admin: API Key Created',
				value: 'admin.api_key_created',
				description: 'API key was created',
			},
			{
				name: 'Admin: API Key Revoked',
				value: 'admin.api_key_revoked',
				description: 'API key was revoked',
			},
			// Data Events
			{
				name: 'Data: Export',
				value: 'data.export',
				description: 'Data was exported',
			},
			{
				name: 'Data: Bulk Delete',
				value: 'data.bulk_delete',
				description: 'Bulk data deletion',
			},
			{
				name: 'Data: Sensitive Access',
				value: 'data.sensitive_access',
				description: 'Sensitive data was accessed',
			},
			// Security Events
			{
				name: 'Security: Suspicious Activity',
				value: 'security.suspicious_activity',
				description: 'Suspicious activity detected',
			},
			{
				name: 'Security: Rate Limit Exceeded',
				value: 'security.rate_limit_exceeded',
				description: 'Rate limit was exceeded',
			},
			{
				name: 'Security: IP Blocked',
				value: 'security.ip_blocked',
				description: 'IP address was blocked',
			},
			{
				name: 'Security: Brute Force Detected',
				value: 'security.brute_force_detected',
				description: 'Brute force attack detected',
			},
			// Custom Event
			{
				name: 'Custom Event',
				value: 'custom',
				description: 'Define a custom event type',
			},
		],
		default: 'auth.login_failed',
		description: 'The type of security event to track',
	},
	{
		displayName: 'Custom Event Type',
		name: 'customEventType',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['create'],
				eventType: ['custom'],
			},
		},
		default: '',
		placeholder: 'category.action',
		description: 'Custom event type in format category.action (e.g., billing.payment_failed)',
	},
	{
		displayName: 'Actor ID',
		name: 'actorId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['create'],
			},
		},
		typeOptions: {
			maxLength: 255,
		},
		default: '',
		placeholder: 'user_123',
		description: 'Unique identifier for the actor (user) performing the action. Maximum 255 characters.',
	},
	{
		displayName: 'Actor Email',
		name: 'actorEmail',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['create'],
			},
		},
		default: '',
		placeholder: 'user@example.com',
		description: 'Email address of the actor (optional)',
	},
	{
		displayName: 'User IP',
		name: 'userIp',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['create'],
			},
		},
		default: '',
		placeholder: '192.168.1.1',
		description: 'IP address of the user making the request',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Timestamp',
				name: 'timestamp',
				type: 'dateTime',
				default: '',
				description: 'Custom timestamp for the event (defaults to current time)',
			},
		],
	},
	{
		displayName: 'Metadata',
		name: 'metadata',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Metadata',
		default: {},
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'metadataValues',
				displayName: 'Metadata',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
						placeholder: 'reason',
						description: 'Key for the metadata entry',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						placeholder: 'invalid_password',
						description: 'Value for the metadata entry',
					},
				],
			},
		],
		description: 'Additional key-value metadata to include with the event',
	},

	// ----------------------------------
	//         event:get
	// ----------------------------------
	{
		displayName: 'Event ID',
		name: 'eventId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'The ID of the event to retrieve',
	},

	// ----------------------------------
	//         event:getAll
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['event'],
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
				resource: ['event'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return. Maximum: 100 per request (Free tier: 10 max).',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Event Type',
				name: 'eventType',
				type: 'string',
				default: '',
				placeholder: 'auth.login_failed',
				description: 'Filter by event type',
			},
			{
				displayName: 'Actor ID',
				name: 'actorId',
				type: 'string',
				default: '',
				description: 'Filter by actor ID',
			},
			{
				displayName: 'Severity',
				name: 'severity',
				type: 'options',
				options: [
					{
						name: 'Critical',
						value: 'critical',
						description: 'Critical events requiring immediate attention (privilege escalation, bulk delete, suspicious activity)',
					},
					{
						name: 'Warning',
						value: 'warning',
						description: 'Warning events that should be reviewed soon (failed logins, MFA disabled, rate limits)',
					},
					{
						name: 'Info',
						value: 'info',
						description: 'Informational events for normal operations (successful logins, logouts, profile updates)',
					},
				],
				default: '',
				description: 'Filter by severity level (computed from event type)',
				hint: 'Each returned event includes a "severity" field. Use {{ $json.severity }} in IF/Switch nodes to route by severity.',
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				default: '',
				description: 'Filter events after this date',
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'dateTime',
				default: '',
				description: 'Filter events before this date',
			},
		],
	},
];
