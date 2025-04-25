from flask import Blueprint, jsonify, request
import pandas as pd
import numpy as np
import traceback
from flask_cors import cross_origin
from datetime import datetime
# Import utility functions 
from app.utils.json_utils import clean_for_json
from app.utils.rate import fetch_stock_data, fetch_exchange_rate

# Create a Blueprint for the API routes
api_bp = Blueprint('api', __name__)

@api_bp.route("/ping", methods=["GET"])
@cross_origin()
def ping():
    """Health check endpoint"""
    return jsonify({
        "status": "ok", 
        "timestamp": datetime.now().isoformat(), 
        "version": "1.0.0"
    })

@api_bp.route("/exchange-rate", methods=["POST"])
@cross_origin()
def exchange_rate_endpoint():
    """Endpoint to fetch exchange rate"""
    try:
        # Extract parameters from request
        if request.method == "POST" and request.is_json:
            data = request.get_json()
            base_currency = data.get('base_currency', 'USD')
        else:
            base_currency = request.args.get('base_currency', 'USD')
        
        if not base_currency:
            return jsonify({
                'error': 'Missing symbol parameter',
                'message': 'Please provide a currency symbol'
            }), 400
                    
        # Fetch exchange rate with our improved function
        rate_data = fetch_exchange_rate(base_currency)
        
        # Build response using the rate data format
        response = {
            'base_currency': base_currency,
            'rate': rate_data
        }
        
        return jsonify(response)
    except Exception as e:
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'message': 'Failed to fetch exchange rate data'
        }), 500


    
@api_bp.route("/stock-data", methods=["POST"])
@cross_origin()
def stock_data_endpoint():
    """Endpoint to fetch stock data and prepare it for the frontend chart"""
    try:
        if request.is_json:
            # Get data from JSON body
            data = request.get_json()
            symbol = data.get('symbol', 'NVDA')
            timeframe = data.get('timeframe', '1Y') 
            interval = data.get('interval', 'day')
        else: 
            symbol = request.args.get('symbol', 'NVDA')
            timeframe = request.args.get('timeframe', '1Y')
            interval = request.args.get('interval', 'day')
        print(f"Fetching stock data for {symbol} - {timeframe} - {interval}")
        # Fetch data using your existing functions
        data = fetch_stock_data(symbol, timeframe, interval)
        
        # Create response with the exact field names expected by frontend
        response = {
            'symbol': symbol,
            'timeframe': timeframe,
            'interval': interval,
            'price': data['Close'].tolist(),          
            'dates': data.index.strftime('%Y-%m-%d').tolist(), 
        }
        
        # Clean any NaN or non-JSON serializable values
        clean_for_json(response)
        return jsonify(response)
    except Exception as e:
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'message': 'Failed to fetch stock data'
        }), 500
