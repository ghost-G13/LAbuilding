import gzip
import json
import os

input_path = r"G:\GIS工程与开发\数据处理\LA_data\part-00015-4feead82-d499-422b-94cb-c036c212127a.c000.csv.gz"
output_path = r"G:\GIS工程与开发\数据处理\la_023012311.geojson"

print(f"Converting {os.path.basename(input_path)} to GeoJSON...")

with gzip.open(input_path, 'rt', encoding='utf-8') as gz:
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('{"type": "FeatureCollection", "features": [')
        first = True
        count = 0
        
        for line in gz:
            line = line.strip()
            if line:
                if not first:
                    f.write(',')
                f.write(line)
                first = False
                count += 1
        
        f.write(']}')

print(f"Done! {count} features written to {output_path}")
print(f"File size: {os.path.getsize(output_path)/1024/1024:.2f} MB")