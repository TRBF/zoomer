import io
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlsplit, parse_qs

from PIL import Image

# We rely on existing backend functions. Do not modify them.
import interface


class TileHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        # CORS preflight support
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def do_GET(self):
        parts = urlsplit(self.path)
        if parts.path != "/tile":
            self.send_response(404)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            return

        qs = parse_qs(parts.query)

        def get_int(name: str, default: int) -> int:
            try:
                return int(qs.get(name, [default])[0])
            except Exception:
                return default

        # Inputs default to a 1920x1080 viewport from the top-left at 1x
        zoom = max(1, get_int("zoom", 1))
        x = max(0, get_int("x", 0))
        y = max(0, get_int("y", 0))
        w = max(1, get_int("w", 1920))
        h = max(1, get_int("h", 1080))

        try:
            img: Image.Image = interface.get_stitched_image(
                x=x,
                y=y,
                zoom_level=zoom,
                w_resolution=w,
                h_resolution=h,
                w_img=interface.w_img,
                h_img=interface.h_img,
            )

            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=90)
            data = buf.getvalue()

            self.send_response(200)
            self.send_header("Content-Type", "image/jpeg")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(data)
        except Exception:
            # Fail closed with 400 for bad inputs or missing tiles
            self.send_response(400)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()


def run(host: str = "0.0.0.0", port: int = 8000):
    httpd = HTTPServer((host, port), TileHandler)
    print(f"Serving tiles on http://{host}:{port}/tile?zoom=Z&x=X&y=Y&w=W&h=H")
    httpd.serve_forever()


if __name__ == "__main__":
    # Ensure the working directory is the backend folder when starting the server,
    # so that relative paths used by existing code resolve correctly.
    run()


