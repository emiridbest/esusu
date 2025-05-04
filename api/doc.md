# Esusu Fiat Exchange API

## Overview

The Esusu Fiat Exchange API provides financial data services including real-time currency exchange rates and stock market information. This documentation outlines how to interact with the API endpoints.

## Base URL

For local development:
```
http://127.0.0.1:3000
```

## Authentication

Currently, the API does not require authentication.

## API Endpoints

### Health Check

Check if the API is running properly.

**Endpoint:** `/api/ping`

**Method:** `GET`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-04-27T12:34:56.789012",
  "version": "1.0.0"
}
```

### Exchange Rate

Get the current exchange rate for a specified base currency.

**Endpoint:** `/api/exchange-rate`

**Method:** `POST`

**Request Body:**
```json
{
  "base_currency": "NGN=X"
}
```

**Parameters:**
- `base_currency` (string, required): The currency code to get exchange rates for (e.g., "USD", "EUR", "NGN", "GBP").

**Response:**
```json
{
  "base_currency": "NGN",
  "rate": 1599.04
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "message": "Failed to fetch exchange rate data"
}
```

### Stock Data

Get historical stock price data for a specified stock symbol.

**Endpoint:** `/api/stock-data`

**Method:** `POST`

**Request Body:**
```json
{
  "symbol": "NVDA",
  "timeframe": "1Y",
  "interval": "day"
}
```

**Parameters:**
- `symbol` (string, required): Stock symbol (e.g., "AAPL", "MSFT", "NVDA")
- `timeframe` (string, optional): Time period to fetch data for. Options:
  - `1M`: 1 month
  - `3M`: 3 months
  - `6M`: 6 months
  - `1Y`: 1 year (default)
  - `2Y`: 2 years
  - `5Y`: 5 years
- `interval` (string, optional): Data frequency. Options:
  - `minute`: 1-minute intervals
  - `5min`: 5-minute intervals
  - `15min`: 15-minute intervals
  - `30min`: 30-minute intervals
  - `hour`: 1-hour intervals
  - `day`: 1-day intervals (default)
  - `week`: 1-week intervals
  - `month`: 1-month intervals

**Response:**
```json
{
  "symbol": "NVDA",
  "timeframe": "1Y",
  "interval": "day",
  "price": [245.67, 246.89, 250.12, 249.87, ...],
  "dates": ["2024-04-27", "2024-04-28", "2024-04-29", ...]
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "message": "Failed to fetch stock data"
}
```

## Usage Examples

### Exchange Rate Example

#### Request:

```bash
curl -X POST http://localhost:5000/api/exchange-rate \
  -H "Content-Type: application/json" \
  -d '{"base_currency": "USD"}'
```

#### Response:

```json
{
  "base_currency": "USD",
  "rate": 756.42
}
```

### Stock Data Example

#### Request:

```bash
curl -X POST http://localhost:5000/api/stock-data \
  -H "Content-Type: application/json" \
  -d '{"symbol": "AAPL", "timeframe": "3M", "interval": "day"}'
```

#### Response:

```json
{
  "symbol": "AAPL",
  "timeframe": "3M",
  "interval": "day",
  "price": [187.32, 188.17, 186.95, 190.05, ...],
  "dates": ["2025-01-27", "2025-01-28", "2025-01-29", ...]
}
```

## Cryptocurrency Support

The API also supports cryptocurrency symbols. When using cryptocurrency symbols, append "-USD" automatically:

Supported cryptocurrencies:
- BTC (Bitcoin)
- ETH (Ethereum)
- DOGE (Dogecoin)
- XRP (Ripple)
- SOL (Solana)

## Error Handling

The API returns appropriate HTTP status codes:

- 200: Success
- 400: Bad Request (missing or invalid parameters)
- 404: Not Found (endpoint doesn't exist)
- 500: Internal Server Error

All errors include a JSON response with `error` and `message` fields providing details about what went wrong.

## Limitations

- For intraday data (intervals smaller than 1 day), timeframes are limited to a maximum of 60 days due to data provider constraints.
- The API uses Yahoo Finance as the data source, so all limitations of that service apply.

## Integration with Esusu Frontend

This API is designed to work with the Esusu frontend application. The frontend makes requests to these endpoints to display exchange rates and financial data in various components.

