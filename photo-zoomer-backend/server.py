#!/usr/bin/env python3
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs
import os
import json

class ImageServer(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        # Enable CORS for frontend
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        if parsed_path.path == '/image':
            # Parse query parameters
            query_params = parse_qs(parsed_path.query)
            
            try:
                zoom = int(query_params.get('zoom', [1])[0])
                x = int(query_params.get('x', [0])[0])
                y = int(query_params.get('y', [0])[0])
                
                # Construct the filename based on the naming pattern from nasa.py
                # Pattern: test_compression_level_{zoom}_x_{x}_y_{y}.jpg
                filename = f'assets/test_compression_level_{zoom}_x_{x}_y_{y}.jpg'
                
                if os.path.exists(filename):
                    # Serve the image
                    self.send_header('Content-Type', 'image/jpeg')
                    self.end_headers()
                    
                    with open(filename, 'rb') as f:
                        self.wfile.write(f.read())
                else:
                    # Image not found
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    response = {'error': f'Image not found: {filename}'}
                    self.wfile.write(json.dumps(response).encode())
            except Exception as e:
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                response = {'error': str(e)}
                self.wfile.write(json.dumps(response).encode())
        
        elif parsed_path.path == '/image-info':
            # Return information about available zoom levels and image dimensions
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            # Get list of available images in assets directory
            assets_dir = 'assets'
            available_files = [f for f in os.listdir(assets_dir) if f.startswith('test_compression_level_')]
            
            # Extract unique zoom levels and coordinates
            zoom_levels = set()
            coordinates = {}
            
            for filename in available_files:
                parts = filename.replace('.jpg', '').split('_')
                try:
                    zoom_idx = parts.index('level') + 1
                    x_idx = parts.index('x') + 1
                    y_idx = parts.index('y') + 1
                    
                    zoom = int(parts[zoom_idx])
                    x = int(parts[x_idx])
                    y = int(parts[y_idx])
                    
                    zoom_levels.add(zoom)
                    
                    if zoom not in coordinates:
                        coordinates[zoom] = []
                    coordinates[zoom].append({'x': x, 'y': y})
                except (ValueError, IndexError):
                    continue
            
            response = {
                'zoom_levels': sorted(list(zoom_levels)),
                'coordinates': coordinates
            }
            self.wfile.write(json.dumps(response).encode())
        
        else:
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'NASA Image Zoomer API\n\nEndpoints:\n  /image?zoom=X&x=Y&y=Z\n  /image-info')
    
    def do_OPTIONS(self):
        # Handle CORS preflight
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def log_message(self, format, *args):
        # Custom log format
        print(f"[{self.log_date_time_string()}] {format % args}")

def run_server(port=8000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, ImageServer)
    print(f'🚀 NASA Image Server running on http://localhost:{port}')
    print(f'📡 Endpoints:')
    print(f'   - http://localhost:{port}/image?zoom=1&x=0&y=0')
    print(f'   - http://localhost:{port}/image-info')
    httpd.serve_forever()

if __name__ == '__main__':
    # Change to the script's directory so relative paths work
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    run_server()
