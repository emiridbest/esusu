from app import create_app
import logging

app = create_app()

if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG)
    app.logger.info('Starting TradingML application')
    app.logger.info(f'Registered routes: {[r.rule for r in app.url_map.iter_rules()]}')
    app.run(debug=True)