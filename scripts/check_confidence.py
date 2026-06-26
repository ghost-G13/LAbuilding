import json
import numpy as np

with open('la_height_filled.geojson') as f:
    d = json.load(f)

features = d['features']
confidences = [f['properties']['confidence'] for f in features]

conf_array = np.array(confidences)
has_conf = conf_array > 0
no_conf = conf_array <= 0

print(f'总建筑数: {len(features)}')
print(f'有置信度数据: {np.sum(has_conf)} ({100*np.sum(has_conf)/len(features):.1f}%)')
print(f'无置信度数据(confidence=-1): {np.sum(no_conf)} ({100*np.sum(no_conf)/len(features):.1f}%)')

if np.sum(has_conf) > 0:
    valid_confs = conf_array[has_conf]
    print(f'\n有置信度数据的统计:')
    print(f'  最小值: {np.min(valid_confs):.4f}')
    print(f'  最大值: {np.max(valid_confs):.4f}')
    print(f'  平均值: {np.mean(valid_confs):.4f}')
    print(f'  中位数: {np.median(valid_confs):.4f}')