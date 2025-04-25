from flask import Blueprint, jsonify, request
import pandas as pd
import numpy as np
import traceback
from flask_cors import cross_origin
from datetime import datetime
# Import utility functions
from app.utils.json_utils import clean_for_json

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

@api_bp.route("/exchange-rate", methods=["POST", "GET", "OPTIONS"])
@cross_origin()
def exchange_rate_endpoint():
    """Endpoint to fetch exchange rate"""
    try:
        # Extract parameters from request
        if request.method == "POST" and request.is_json:
            data = request.get_json()
            symbol = data.get('base_currency', 'GHC')
        else:
            symbol = request.args.get('base_currency', 'GHC')
        
        if not symbol:
            return jsonify({
                'error': 'Missing symbol parameter',
                'message': 'Please provide a currency symbol'
            }), 400
            
        from app.utils.rate import fetch_exchange_rate
        
        # Fetch exchange rate with our improved function
        rate_data = fetch_exchange_rate(f"{symbol}=X")
        print(f"Fetched rate data: {rate_data}")
        # Build response using the new rate data format
        response = {
            'symbol': symbol,
            'rate': rate_data,
        }
        
        # Add warning if present (for fallback rates)
        if 'warning' in rate_data:
            response['warning'] = rate_data['warning']
        
        clean_for_json(response)
        return jsonify(response)
    except Exception as e:
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'message': 'Failed to fetch exchange rate data'
        }), 500