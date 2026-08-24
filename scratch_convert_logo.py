from PIL import Image
import os

img_path = r"c:\Users\hamza\OneDrive\Desktop\NAR\engro.jfif"
out_path = r"c:\Users\hamza\OneDrive\Desktop\NAR\public\engro_logo.png"

img = Image.open(img_path).convert("RGBA")
datas = img.getdata()

new_data = []
for item in datas:
    # Check if pixel is white or near white (R > 230, G > 230, B > 230)
    if item[0] > 230 and item[1] > 230 and item[2] > 230:
        # Transparent
        new_data.append((255, 255, 255, 0))
    elif item[0] > 210 and item[1] > 210 and item[2] > 210:
        # Smooth alpha transition
        alpha = int(255 - ((min(item[0], item[1], item[2]) - 210) / 20.0) * 255)
        new_data.append((item[0], item[1], item[2], max(0, min(255, alpha))))
    else:
        new_data.append(item)

img.putdata(new_data)
# Crop bounding box of non-transparent pixels
bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)

# Add small padding
padded = Image.new("RGBA", (img.width + 20, img.height + 20), (0, 0, 0, 0))
padded.paste(img, (10, 10))

os.makedirs(os.path.dirname(out_path), exist_ok=True)
padded.save(out_path, "PNG")
print(f"Successfully converted {img_path} to transparent {out_path} ({padded.size})")
