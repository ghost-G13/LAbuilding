"""
建筑数据裁剪脚本
功能：裁剪GeoJSON数据，只保留完全落在指定矩形范围内的建筑
"""
import gzip
import json
import os

# ============================================================
# 配置参数
# ============================================================

# 裁剪范围（用户指定）
# 左上角：34.081140, -118.319045
# 右下角：33.990664, -118.208441
CLIP_NORTH = 34.081140   # 北边界（最大纬度）
CLIP_SOUTH = 33.990664   # 南边界（最小纬度）
CLIP_WEST = -118.319045  # 西边界（最小经度）
CLIP_EAST = -118.208441   # 东边界（最大经度）

# 输入输出文件
INPUT_GEOJSONL = r"G:\GIS工程与开发\数据处理\LA_data\part-00015-4feead82-d499-422b-94cb-c036c212127a.c000.csv.gz"
OUTPUT_DIR = r"G:\GIS工程与开发\数据处理\LA_data"

# ============================================================
# 工具函数
# ============================================================

def get_feature_bounds(feature):
    """
    获取单个建筑的外接矩形边界

    参数:
        feature: GeoJSON Feature对象

    返回:
        (min_lon, max_lon, min_lat, max_lat): 建筑的边界
    """
    coords = feature['geometry']['coordinates'][0]  # 外环坐标

    lons = [c[0] for c in coords]
    lats = [c[1] for c in coords]

    return min(lons), max(lons), min(lats), max(lats)


def is_fully_contained(feature, north, south, west, east):
    """
    检查建筑是否完全落在指定矩形范围内

    参数:
        feature: GeoJSON Feature对象
        north: 北边界（最大纬度）
        south: 南边界（最小纬度）
        west: 西边界（最小经度）
        east: 东边界（最大经度）

    返回:
        bool: 整个建筑是否完全在范围内
    """
    min_lon, max_lon, min_lat, max_lat = get_feature_bounds(feature)

    # 检查建筑边界是否完全在裁剪范围内
    return (min_lon >= west and max_lon <= east and
            min_lat >= south and max_lat <= north)


def clip_geojsonl(input_path, output_path, north, south, west, east):
    """
    裁剪GeoJSONL数据

    参数:
        input_path: 输入GeoJSONL文件路径（.csv.gz）
        output_path: 输出GeoJSON文件路径
        north, south, west, east: 裁剪边界

    返回:
        dict: 裁剪统计信息
    """
    total_count = 0       # 总建筑数量
    kept_count = 0        # 保留的建筑数量
    filtered_count = 0    # 被过滤的建筑数量

    print(f"开始裁剪数据...")
    print(f"裁剪范围:")
    print(f"  北界: {north:.6f}°N")
    print(f"  南界: {south:.6f}°N")
    print(f"  西界: {abs(west):.6f}°W")
    print(f"  东界: {abs(east):.6f}°W")
    print()

    with gzip.open(input_path, 'rt', encoding='utf-8') as gz_in:
        with open(output_path, 'w', encoding='utf-8') as f_out:
            # 写入GeoJSON头部
            f_out.write('{"type": "FeatureCollection", "features": [')
            first = True

            for line in gz_in:
                line = line.strip()
                if not line:
                    continue

                total_count += 1

                try:
                    feature = json.loads(line)

                    # 检查是否完全包含在裁剪范围内
                    if is_fully_contained(feature, north, south, west, east):
                        if not first:
                            f_out.write(',')
                        f_out.write(line)
                        first = False
                        kept_count += 1
                    else:
                        filtered_count += 1

                    # 进度显示
                    if total_count % 200000 == 0:
                        print(f"  已处理: {total_count:,} 条, 保留: {kept_count:,} 条")

                except json.JSONDecodeError:
                    filtered_count += 1

            # 写入GeoJSON尾部
            f_out.write(']}')

    # 计算统计信息
    coverage = (kept_count / total_count * 100) if total_count > 0 else 0

    return {
        'total': total_count,
        'kept': kept_count,
        'filtered': filtered_count,
        'coverage': coverage
    }


def create_sample(output_path, sample_size=1000):
    """
    从裁剪后的数据中提取样本

    参数:
        output_path: 原始GeoJSON文件路径
        sample_size: 样本大小
    """
    sample_path = output_path.replace('.geojson', '_sample.geojson')

    print(f"\n提取 {sample_size} 条样本数据...")

    with open(output_path, 'r', encoding='utf-8') as f_in:
        with open(sample_path, 'w', encoding='utf-8') as f_out:
            data = json.load(f_in)
            features = data['features']

            # 取前sample_size条
            sample_features = features[:sample_size]

            f_out.write('{"type": "FeatureCollection", "features": [')
            for i, feat in enumerate(sample_features):
                if i > 0:
                    f_out.write(',')
                f_out.write(json.dumps(feat, ensure_ascii=False))
            f_out.write(']}')

    sample_size_bytes = os.path.getsize(sample_path)
    print(f"样本已保存: {sample_path} ({sample_size_bytes/1024:.2f} KB)")

    return sample_path


# ============================================================
# 主程序
# ============================================================

if __name__ == "__main__":
    print("=" * 60)
    print("建筑数据裁剪工具")
    print("=" * 60)
    print()

    # 生成输出文件名
    output_file = os.path.join(OUTPUT_DIR, "la_clipped.geojson")

    # 执行裁剪
    stats = clip_geojsonl(
        INPUT_GEOJSONL,
        output_file,
        CLIP_NORTH,
        CLIP_SOUTH,
        CLIP_WEST,
        CLIP_EAST
    )

    # 显示统计结果
    print()
    print("=" * 60)
    print("裁剪完成!")
    print("=" * 60)
    print(f"总建筑数量:     {stats['total']:,}")
    print(f"保留建筑数量:   {stats['kept']:,}")
    print(f"过滤建筑数量:   {stats['filtered']:,}")
    print(f"数据保留比例:   {stats['coverage']:.2f}%")
    print()
    print(f"输出文件: {output_file}")

    # 显示输出文件大小
    output_size = os.path.getsize(output_file)
    print(f"文件大小: {output_size/1024/1024:.2f} MB")

    # 提取样本
    if stats['kept'] > 0:
        create_sample(output_file, sample_size=1000)

    print()
    print("=" * 60)
