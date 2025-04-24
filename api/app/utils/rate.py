import pandas as pd
import yfinance as yf
import time
from typing import Dict, Any

def fetch_exchange_rate(symbol: str, base_currency: str = "USD", retries: int = 3) -> pd.DataFrame:
    """
    Fetch currency exchange rate data.
    
    Parameters:
        symbol (str): Currency symbol (e.g., 'NGN', 'EUR')
        base_currency (str): Base currency, defaults to 'USD'
        retries (int): Number of retry attempts if rate limited
    
    Returns:
        pd.DataFrame: Historical exchange rate data
    """
    try:
        # Calculate date ranges
        end_date = pd.Timestamp.now()
        start_date = (end_date - pd.Timedelta(days=30)).strftime('%Y-%m-%d')
        
        # Format the symbol properly for currency pairs
        if len(symbol) == 3 and symbol.isalpha():
            formatted_symbol = f"{symbol}=X"
        else:
            formatted_symbol = symbol
        
        # Implement retry with exponential backoff
        for attempt in range(retries):
            try:
                data = yf.download(
                    formatted_symbol,
                    start=start_date,
                    end=end_date.strftime('%Y-%m-%d'),
                    progress=False
                )
                
                if data.empty:
                    raise Exception(f"No data found for symbol {formatted_symbol}")
                
                # Clean up multi-level columns if present
                if isinstance(data.columns, pd.MultiIndex):
                    data.columns = data.columns.get_level_values(0)
                
                data = data.dropna()
                return data
                
            except Exception as e:
                if "Rate limited" in str(e) and attempt < retries - 1:
                    # Wait before retrying (exponential backoff)
                    wait_time = 2 ** attempt
                    time.sleep(wait_time)
                    continue
                else:
                    raise
        
    except Exception as e:
        raise Exception(f"Error fetching exchange rate for {symbol}: {str(e)}")