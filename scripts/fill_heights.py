"""
LA建筑数据高度填充脚本 - 简化版
分步处理，避免超时
"""

import json
import numpy as np
from collections import defaultdict
import os
import time

# 文件路径
script_dir = os.path.dirname(os.path.abspath(__file__))
input_file = os.path.join(script_dir, 'la_clipped_with_area.geojson')
output_file = os.path.join(script_dir, 'la_height_filled.geojson')

print("步骤1: 读取数据...", flush=True)
t0 = time.time()
with open(input_file, 'r', encoding='utf-8') as f:
    data = json.load(f)
print(f"  读取完成，耗时: {time.time()-t0:.1f}s", flush=True)

features = data['features']
n = len(features)
print(f"  总建筑数量: {n}", flush=True)

# 预提取高度数据
heights = np.array([f['properties']['height'] for f in features])
valid_mask = heights > 0
global_median = float(np.median(heights[valid_mask]))

no_height_count = np.sum(~valid_mask)
print(f"  有高度数据: {np.sum(valid_mask)}", flush=True)
print(f"  无高度数据: {no_height_count}", flush=True)
print(f"  全局中位数: {global_median:.2f} m", flush=True)

print("\n步骤2: 计算中心点...", flush=True)
t0 = time.time()
centroids = np.zeros((n, 2))
for i, f in enumerate(features):
    coords = np.array(f['geometry']['coordinates'][0])
    centroids[i] = coords.mean(axis=0)
print(f"  计算完成，耗时: {time.time()-t0:.1f}s", flush=True)

# 网格索引
print("\n步骤3: 构建空间索引...", flush=True)
t0 = time.time()
grid_size = 0.02  # 约2km
grid = defaultdict(list)
for i in range(n):
    gx = int(centroids[i, 0] / grid_size)
    gy = int(centroids[i, 1] / grid_size)
    grid[(gx, gy)].append(i)
print(f"  网格数: {len(grid)}，耗时: {time.time()-t0:.1f}s", flush=True)

# 预计算邻近网格
search_r = 2
neighbor_offsets = []
for dx in range(-search_r, search_r + 1):
    for dy in range(-search_r, search_r + 1):
        if dx != 0 or dy != 0:
            neighbor_offsets.append((dx, dy))

print("\n步骤4: 填充无高度数据...", flush=True)
t0 = time.time()
filled_by_neighbors = 0
filled_by_global = 0

# 只处理无高度数据的索引
no_height_indices = np.where(~valid_mask)[0]
print(f"  待填充数量: {len(no_height_indices)}", flush=True)

for count, i in enumerate(no_height_indices):
    gx = int(centroids[i, 0] / grid_size)
    gy = int(centroids[i, 1] / grid_size)

    neighbor_heights = []
    for dx, dy in neighbor_offsets:
        key = (gx + dx, gy + dy)
        if key in grid:
            for n_idx in grid[key]:
                if valid_mask[n_idx]:
                    neighbor_heights.append(heights[n_idx])

    if neighbor_heights:
        features[i]['properties']['height'] = round(float(np.median(neighbor_heights)), 2)
        features[i]['properties']['height_filled'] = True
        filled_by_neighbors += 1
    else:
        features[i]['properties']['height'] = round(global_median, 2)
        features[i]['properties']['height_filled'] = True
        features[i]['properties']['height_fallback'] = 'global_median'
        filled_by_global += 1

    if (count + 1) % 2000 == 0:
        print(f"  进度: {count+1}/{len(no_height_indices)} ({100*(count+1)/len(no_height_indices):.1f}%)", flush=True)

print(f"  填充完成，耗时: {time.time()-t0:.1f}s", flush=True)
print(f"  - 邻近插值: {filled_by_neighbors}", flush=True)
print(f"  - 全局中位数: {filled_by_global}", flush=True)

print("\n步骤5: 保存结果...", flush=True)
t0 = time.time()
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print(f"  保存完成，耗时: {time.time()-t0:.1f}s", flush=True)
print(f"  输出文件: {output_file}", flush=True)

# 验证
new_heights = [f['properties']['height'] for f in features]
print(f"\n填充后高度统计:", flush=True)
print(f"  最小值: {min(new_heights):.2f} m", flush=True)
print(f"  最大值: {max(new_heights):.2f} m", flush=True)
print(f"  平均值: {np.mean(new_heights):.2f} m", flush=True)
print(f"  中位数: {np.median(new_heights):.2f} m", flush=True)