import re

input_file = "C:/Users/Raman/Documents/Antigravity/ProjectFlow/user-manual.html"
output_file = "C:/Users/Raman/Documents/Antigravity/ProjectFlow/public/user-manual.html"

with open(input_file, "r", encoding="utf-8") as f:
    content = f.read()

# Replace any public screenshots paths or cache screenshots paths with just "screenshots/"
content = content.replace("C:/Users/Raman/AppData/Local/hermes/cache/screenshots/", "screenshots/")
content = content.replace("./public/screenshots/", "screenshots/")

# Save the final file to public folder
with open(output_file, "w", encoding="utf-8") as f:
    f.write(content)

print("Saved output to public/user-manual.html successfully!")
