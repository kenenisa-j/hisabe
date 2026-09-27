import os
from PIL import Image, ImageDraw, ImageFont

def generate_hisabe_icon():
    size = 512
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Outer container: Dark navy background with rounded corners and glowing border
    # Background rounded rect
    margin = 12
    bg_rect = [margin, margin, size - margin, size - margin]
    radius = 96
    
    # Outer glow border (Emerald green)
    draw.rounded_rectangle(bg_rect, radius=radius, fill=(5, 20, 38, 255), outline=(16, 185, 129, 255), width=16)

    # 2. Financial Growth Bars (Ethiopian Tricolor: Green, Yellow/Gold, Red)
    # Green Bar (Left)
    draw.rounded_rectangle([90, 260, 175, 420], radius=24, fill=(16, 185, 129, 255))
    
    # Gold/Yellow Bar (Center)
    draw.rounded_rectangle([215, 170, 300, 420], radius=24, fill=(245, 158, 11, 255))

    # Red/Crimson Bar (Right)
    draw.rounded_rectangle([340, 90, 425, 420], radius=24, fill=(239, 68, 68, 255))

    # 3. Ascending Trend Arrow (White with Gold tip)
    points = [
        (80, 310),
        (200, 220),
        (330, 130),
        (430, 75)
    ]
    draw.line(points, fill=(255, 255, 255, 255), width=28)

    # Arrowhead at top right
    draw.polygon([(440, 60), (380, 75), (425, 120)], fill=(254, 240, 138, 255))

    # Save PNGs
    output_png_paths = [
        r"C:\Users\User\Desktop\Hisabe\public\hisabe-logo.png",
        r"C:\Users\User\Desktop\Hisabe\src\app\icon.png",
        r"C:\Users\User\Desktop\Hisabe\public\apple-touch-icon.png",
    ]

    for path in output_png_paths:
        img.save(path, format="PNG")
        print(f"Saved {path}")

    # Save multi-size ICO
    ico_img = img.resize((256, 256), Image.Resampling.LANCZOS)
    ico_paths = [
        r"C:\Users\User\Desktop\Hisabe\public\favicon.ico",
        r"C:\Users\User\Desktop\Hisabe\src\app\favicon.ico",
    ]
    for path in ico_paths:
        ico_img.save(path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
        print(f"Saved {path}")

if __name__ == "__main__":
    generate_hisabe_icon()
