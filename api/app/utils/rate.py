import pandas as pd
import yfinance as yf
import time
import requests
import json
from typing import Dict, Any, Union

def fetch_exchange_rate(symbol: str, interval: str = "1h", timeframe: str = "1M") -> Dict[str, Any]:
    """
    Fetch currency exchange rate data with fallback options.
    
    Parameters:
        symbol (str): Currency symbol (e.g., 'NGN', 'EUR')
        base_currency (str): Base currency, defaults to 'USD'
        retries (int): Number of retry attempts if rate limited
    
    Returns:
        Dict[str, Any]: Exchange rate data with rate and timestamp
    """
    # Try Yahoo Finance first
    try:
        end_date = pd.Timestamp.now()

            
        start_date = (end_date - pd.Timedelta(days=10)).strftime('%Y-%m-%d')
        
        data = yf.download(
            symbol,
            start=start_date,
            end=end_date.strftime('%Y-%m-%d'),
            interval="1D",
        )
        
        if data.empty:
            raise Exception(f"No data found for symbol {symbol} ")
        
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = data.columns.get_level_values(0)
        data = data.dropna()

        return data["close"].iloc[-1]
    
    except Exception as e:
        raise Exception(f"Error fetching {interval} data for {symbol}: {str(e)}")
        