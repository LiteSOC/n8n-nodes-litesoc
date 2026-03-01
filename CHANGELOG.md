# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] - 2026-03-02

### Changed
- **Alerts Endpoint**: Changed from `/alerts/list` to `/alerts` to match the documented public API
- **Event Collection**: Removed `timestamp` from additionalFields (API auto-generates timestamps)
- **Actor ID**: Made `actorId` field optional with empty string default (matches API behavior)

### Removed
- **Alert Filters**: Removed undocumented filter options that are not supported by the public API:
  - `actorId` - Filter by actor ID
  - `startDate` - Filter alerts after this date
  - `endDate` - Filter alerts before this date

### Fixed
- **Pagination**: Fixed `litesocApiRequestAllItems` to correctly use `offset` parameter and read `pagination.total` from response

## [1.2.0] - 2026-03-05

### Fixed
- **API Compatibility**: Changed `event_type` parameter to `event_name` in Get Many Events operation to match the LiteSOC Management API specification
- **Events Filters**: Removed unsupported `startDate` and `endDate` filter options from Events operations (date filtering is supported on Alerts only)

### Changed
- Updated test expectations to reflect corrected parameter names

## [1.1.0] - 2026-03-01

### Added
- **Alert Output Schema**: 
  - Added `trigger_event_id` (UUID) field to Alert responses - links alerts to their triggering event
  - Added `forensics` object with `network` and `location` data for Pro+ tier users
    - `network`: `is_vpn`, `is_tor`, `is_proxy`, `is_datacenter`, `asn`, `threat_score`
    - `location`: `city`, `country_code`, `region`, `latitude`, `longitude`, `timezone`
  - Note: `forensics` is `null` for Free tier users

- **Event Output Schema**:
  - Added `trigger_event_id` field to Event responses
  - Added `forensics` object with network intelligence and geolocation data for Pro+ tier users
  - Note: `forensics` is `null` for Free tier users

### Changed
- Updated all ID fields (Alert ID, Event ID) documentation to indicate they are now proper UUIDs
- Updated operation descriptions to reflect the new output schema fields
- Improved field placeholders with UUID format examples

### Tests
- Added test coverage for forensics object in event and alert responses
- Added test coverage for null forensics handling (Free tier compatibility)

## [1.0.5] - 2026-02-15

### Fixed
- Minor documentation improvements

## [1.0.4] - 2026-02-01

### Added
- Initial release of n8n-nodes-litesoc community node
- Event tracking: Create, Get, Get Many operations
- Alert management: Get, Get Many, Resolve, Mark Safe operations
- Support for all LiteSOC event types
- Severity auto-assignment documentation
