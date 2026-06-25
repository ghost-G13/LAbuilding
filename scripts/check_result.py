import json

with open('la_height_filled.geojson') as f:
    d = json.load(f)
features = d['features']
heights = [f['properties']['height'] for f in features]
filled = [f['properties'].get('height_filled', False) for f in features]
fallback = [f['properties'].get('height_fallback', '') for f in features]

print(f'总建筑数: {len(features)}')
print(f'高度范围: {min(heights):.2f} - {max(heights):.2f}')
print(f'平均高度: {sum(heights)/len(heights):.2f}')
print(f'填充标记数: {sum(filled)}')
print(f'使用全局中位数: {fallback.count("global_median")}')
print(f'使用邻近插值: {sum(filled) - fallback.count("global_median")}')