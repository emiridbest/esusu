from flask import Blueprint, jsonify, request
import pandas as pd
import numpy as np
import traceback
from flask_cors import cross_origin
import traceback
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
@api_bp.route("/exchange-rate", methods=["GET", "POST"])
@cross_origin()
def exchange_rate_endpoint():
    """Endpoint to fetch exchange rate"""
    try:
        # Extract symbol from request
        if request.method == "POST" and request.is_json:
            data = request.get_json()
            symbol = data.get('base_currency', 'NGN')
        else:
            symbol = request.args.get('base_currency', 'NVDA')
        
        if not symbol:
            return jsonify({
                'error': 'Missing symbol parameter',
                'message': 'Please provide a currency symbol'
            }), 400
            
        from app.utils.rate import fetch_exchange_rate
        data = fetch_exchange_rate(symbol)
        
        # Build response
        response = {
            'symbol': symbol,
            'current_price': float(data['Close'].iloc[-1]),
            'timestamp': datetime.now().isoformat()
        }
        
        clean_for_json(response)
        return jsonify(response)
    except Exception as e:
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'message': 'Failed to fetch exchange rate data'
        }), 500