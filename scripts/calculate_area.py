"""
建筑面积计算脚本（utm库版本）
功能：计算裁剪后每个建筑的面积（平方米），并添加到GeoJSON属性中

使用utm库进行坐标转换，使用鞋带公式计算多边形面积
几何坐标保持WGS84（EPSG:4326）不变
"""
import json
import os
import utm

# ============================================================
# 配置参数
# ============================================================

INPUT_FILE = r"G:\GIS工程与开发\数据处理\LA_data\la_clipped.geojson"
OUTPUT_FILE = r"G:\GIS工程与开发\数据处理\LA_data\la_clipped_with_area.geojson"

# ============================================================
# 工具函数
# ============================================================

def latlon_to_utm(latitude, longitude):
    """
    将经纬度转换为UTM坐标

    参数:
        latitude: 纬度
        longitude: 经度

    返回:
        (easting, northing): UTM坐标（米）
    """
    easting, northing, zone_number, zone_letter = utm.from_latlon(latitude, longitude)
    return easting, northing


def polygon_area_shoelace(coords):
    """
    使用鞋带公式计算多边形面积（平方米）

    参数:
        coords: 多边形顶点坐标列表，格式为 [(x1, y1), (x2, y2), ...]

    返回:
        area_m2: 面积（平方米）
    """
    n = len(coords)
    if n < 3:
        return 0

    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        area += coords[i][0] * coords[j][1]
        area -= coords[j][0] * coords[i][1]

    return abs(area) / 2.0


def calculate_polygon_area(geometry):
    """
    计算多边形面积（平方米）

    参数:
        geometry: GeoJSON几何对象

    返回:
        area_m2: 面积（平方米）
    """
    coords = geometry['coordinates'][0]

    utm_coords = []
    for coord in coords:
        lon, lat = coord[0], coord[1]
        easting, northing = latlon_to_utm(lat, lon)
        utm_coords.append((easting, northing))

    area_m2 = polygon_area_shoelace(utm_coords)

    return area_m2


def add_area_to_features(input_path, output_path):
    """
    为每个建筑添加面积属性

    参数:
        input_path: 输入GeoJSON文件路径
        output_path: 输出GeoJSON文件路径

    返回:
        dict: 统计信息
    """
    print(f"加载数据: {input_path}")

    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    features = data['features']
    total_count = len(features)

    print(f"总建筑数量: {total_count:,}")
    print(f"开始计算面积...")

    area_stats = {
        'total': total_count,
        'success': 0,
        'failed': 0,
        'areas': []
    }

    for i, feature in enumerate(features):
        try:
            area_m2 = calculate_polygon_area(feature['geometry'])

            feature['properties']['area_m2'] = round(area_m2, 2)
            feature['properties']['area_m2_rounded'] = int(round(area_m2))

            area_stats['success'] += 1
            area_stats['areas'].append(area_m2)

            if (i + 1) % 10000 == 0:
                print(f"  已处理: {i + 1:,} 条")

        except Exception as e:
            print(f"  第 {i + 1} 条计算失败: {e}")
            feature['properties']['area_m2'] = -1
            area_stats['failed'] += 1

    if area_stats['areas']:
        min_area = min(area_stats['areas'])
        max_area = max(area_stats['areas'])
        avg_area = sum(area_stats['areas']) / len(area_stats['areas'])
        total_area_m2 = sum(area_stats['areas'])
        total_area_ha = total_area_m2 / 10000
        total_area_km2 = total_area_m2 / 1000000
    else:
        min_area = max_area = avg_area = total_area_m2 = total_area_ha = total_area_km2 = 0

    print(f"\n添加坐标系信息 (EPSG:4326)")
    data['crs'] = {
        "type": "name",
        "properties": {
            "name": "urn:ogc:def:crs:EPSG::4326"
        }
    }

    print(f"保存结果: {output_path}")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)

    output_size = os.path.getsize(output_path)

    return {
        **area_stats,
        'min_area_m2': round(min_area, 2),
        'max_area_m2': round(max_area, 2),
        'avg_area_m2': round(avg_area, 2),
        'total_area_m2': round(total_area_m2, 2),
        'total_area_ha': round(total_area_ha, 2),
        'total_area_km2': round(total_area_km2, 4),
        'output_size_mb': round(output_size / 1024 / 1024, 2)
    }


# ============================================================
# 主程序
# ============================================================

if __name__ == "__main__":
    print("=" * 60)
    print("建筑面积计算工具")
    print("=" * 60)
    print()

    if not os.path.exists(INPUT_FILE):
        print(f"错误: 输入文件不存在: {INPUT_FILE}")
        exit(1)

    stats = add_area_to_features(INPUT_FILE, OUTPUT_FILE)

    print()
    print("=" * 60)
    print("计算完成!")
    print("=" * 60)
    print(f"总建筑数量:     {stats['total']:,}")
    print(f"计算成功:       {stats['success']:,}")
    print(f"计算失败:       {stats['failed']:,}")
    print()
    print("面积统计:")
    print(f"  最小面积:     {stats['min_area_m2']:,.2f} 平方米")
    print(f"  最大面积:     {stats['max_area_m2']:,.2f} 平方米")
    print(f"  平均面积:     {stats['avg_area_m2']:,.2f} 平方米")
    print(f"  总面积(平方米): {stats['total_area_m2']:,.2f}")
    print(f"  总面积(公顷):   {stats['total_area_ha']:,.2f}")
    print(f"  总面积(平方公里): {stats['total_area_km2']:,.4f}")
    print()
    print(f"坐标系: EPSG:4326 (WGS84)")
    print(f"输出文件: {OUTPUT_FILE}")
    print(f"文件大小: {stats['output_size_mb']:.2f} MB")
    print()
    print("=" * 60)