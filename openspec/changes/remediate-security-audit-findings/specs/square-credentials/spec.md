# Square Credentials

## ADDED Requirements

### Requirement: Square Credential Status Is Token-Safe

The frontend SHALL only receive Square credential status and SHALL NOT receive stored Square access tokens.

#### Scenario: Load credential statuses

- **WHEN** the frontend requests `GET /api/square/credentials`
- **THEN** the response SHALL include each location's `location_id`, `square_location_id`, and `configured`
- **AND** the response SHALL NOT include `access_token`.

### Requirement: Square Credentials Can Be Cleared Explicitly

The Square credential API SHALL support explicit per-location clearing without exposing existing access tokens to the frontend.

#### Scenario: Clear saved credential

- **GIVEN** a Square credential is stored for a location
- **WHEN** the frontend sends a credential update for that location with `clear: true`
- **THEN** the Worker SHALL remove the stored credential for that location
- **AND** a later status response SHALL return `configured: false` for that location.

#### Scenario: Blank fields without clear preserve existing credential

- **GIVEN** a Square credential is stored for a location
- **WHEN** the frontend sends blank token or location fields without `clear: true`
- **THEN** the Worker SHALL preserve the existing stored credential.

