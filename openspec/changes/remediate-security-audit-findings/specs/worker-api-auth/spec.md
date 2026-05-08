# Worker API Auth

## ADDED Requirements

### Requirement: Authenticated AI Proxy

The Worker SHALL require the Bakery API token for `/api/messages` before forwarding any request to Anthropic.

#### Scenario: Missing token

- **WHEN** a client sends `POST /api/messages` without `X-Bakery-Token`
- **THEN** the Worker SHALL return `401 Unauthorized`
- **AND** the Worker SHALL NOT call Anthropic.

#### Scenario: Invalid token

- **WHEN** a client sends `POST /api/messages` with an incorrect `X-Bakery-Token`
- **THEN** the Worker SHALL return `401 Unauthorized`
- **AND** the Worker SHALL NOT call Anthropic.

#### Scenario: Valid token

- **WHEN** a client sends `POST /api/messages` with a token matching `BAKERY_API_TOKEN`
- **THEN** the Worker MAY forward the request to Anthropic
- **AND** the response SHALL preserve the expected JSON response behavior for existing AI features.

### Requirement: Frontend AI Requests Include Bakery Token

The frontend Claude service SHALL send `X-Bakery-Token` on `/api/messages` requests when `VITE_BAKERY_API_TOKEN` is configured.

#### Scenario: Token configured

- **GIVEN** `VITE_BAKERY_API_TOKEN` is configured
- **WHEN** the frontend makes an AI request
- **THEN** the request SHALL include `X-Bakery-Token`.

