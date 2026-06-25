import math

def lat_lon_to_quadkey(latitude, longitude, level):
    """
    根据经纬度和层级计算 QuadKey
    
    参数:
        latitude: 纬度（北纬为正，南纬为负）
        longitude: 经度（东经为正，西经为负）
        level: 瓦片层级（1-23）
    
    返回:
        quadkey: 对应的 QuadKey 字符串
    
    算法来源:
        Bing Maps Tile System 官方文档
        https://learn.microsoft.com/en-us/bingmaps/articles/bing-maps-tile-system
    """
    
    # 步骤1: 将经纬度限制在有效范围内
    # 纬度范围: -85.05112878 到 85.05112878 (Web Mercator投影限制)
    # 经度范围: -180 到 180
    latitude = max(-85.05112878, min(85.05112878, latitude))
    longitude = max(-180, min(180, longitude))
    
    # 步骤2: 将经纬度转换为归一化坐标 (0~1)
    # 经度直接线性转换
    x = (longitude + 180) / 360
    
    # 纬度通过 Mercator 投影转换
    sin_lat = math.sin(latitude * math.pi / 180)
    y = 0.5 - math.log((1 + sin_lat) / (1 - sin_lat)) / (4 * math.pi)
    
    # 步骤3: 计算像素坐标（以2^level为地图尺寸）
    # 地图尺寸 = 2^level 像素
    map_size = 2 ** level
    pixel_x = int(max(0, min(map_size - 1, x * map_size)))
    pixel_y = int(max(0, min(map_size - 1, y * map_size)))
    
    # 步骤4: 生成 QuadKey
    # 从最高层级到最低层级，逐位确定每个象限数字
    quadkey = ""
    for i in range(level, 0, -1):
        digit = 0
        mask = 1 << (i - 1)  # 位掩码，用于提取对应位
        
        # 判断X坐标在哪一半（右半部分为1或3）
        if (pixel_x & mask) != 0:
            digit += 1
        
        # 判断Y坐标在哪一半（下半部分为2或3）
        if (pixel_y & mask) != 0:
            digit += 2
        
        # 将当前位添加到 QuadKey
        quadkey += str(digit)
    
    return quadkey

def quadkey_to_lat_lon(quadkey):
    """
    根据 QuadKey 计算其覆盖区域的地理边界
    
    参数:
        quadkey: QuadKey 字符串
    
    返回:
        (lat_min, lat_max, lon_min, lon_max): 边界坐标（北纬为正，西经为负）
    """
    
    # 步骤1: 解析 QuadKey 得到瓦片坐标 (tile_x, tile_y)
    tile_x = 0
    tile_y = 0
    level = len(quadkey)
    
    for i, digit in enumerate(quadkey):
        mask = 1 << (level - i - 1)
        if digit == '1':
            tile_x |= mask
        elif digit == '2':
            tile_y |= mask
        elif digit == '3':
            tile_x |= mask
            tile_y |= mask
    
    # 步骤2: 将瓦片坐标转换为经纬度边界
    # 每个瓦片大小为 256x256 像素
    map_size = 256 * (2 ** level)
    
    # 计算左上角（西北）坐标
    tl_x = tile_x * 256
    tl_y = tile_y * 256
    tl_lon = (tl_x / map_size) * 360 - 180
    tl_lat = 90 - 360 * math.atan(math.exp((tl_y / map_size - 0.5) * 2 * math.pi)) / math.pi
    
    # 计算右下角（东南）坐标
    br_x = (tile_x + 1) * 256
    br_y = (tile_y + 1) * 256
    br_lon = (br_x / map_size) * 360 - 180
    br_lat = 90 - 360 * math.atan(math.exp((br_y / map_size - 0.5) * 2 * math.pi)) / math.pi
    
    # 返回正确的范围（lat_min是较小值，lat_max是较大值）
    lat_min = min(tl_lat, br_lat)
    lat_max = max(tl_lat, br_lat)
    lon_min = min(tl_lon, br_lon)
    lon_max = max(tl_lon, br_lon)
    
    return lat_min, lat_max, lon_min, lon_max

def validate_quadkey_for_location(quadkey, target_lat, target_lon):
    """
    验证 QuadKey 是否覆盖目标位置
    
    参数:
        quadkey: QuadKey 字符串
        target_lat: 目标纬度
        target_lon: 目标经度
    
    返回:
        bool: 是否覆盖
    """
    lat_min, lat_max, lon_min, lon_max = quadkey_to_lat_lon(quadkey)
    return (lat_min <= target_lat <= lat_max) and (lon_min <= target_lon <= lon_max)

if __name__ == "__main__":
    # ==================== 示例：洛杉矶市中心 ====================
    # 洛杉矶市中心地理坐标
    LA_LAT = 34.03    # 北纬 34°03′
    LA_LON = -118.25  # 西经 118°25′
    TARGET_LEVEL = 9   # 微软建筑数据集使用的层级
    
    print("=" * 60)
    print("QuadKey 计算工具 (Bing Maps Tile System)")
    print("=" * 60)
    print()
    
    # 1. 计算洛杉矶的 QuadKey
    print("[步骤1] 计算洛杉矶市中心的 QuadKey")
    print(f"  目标坐标: {LA_LAT}N, {abs(LA_LON)}W")
    print(f"  目标层级: Level {TARGET_LEVEL}")
    
    la_quadkey = lat_lon_to_quadkey(LA_LAT, LA_LON, TARGET_LEVEL)
    print(f"  计算结果: {la_quadkey}")
    print()
    
    # 2. 显示不同层级的 QuadKey
    print("[步骤2] 不同层级的 QuadKey")
    print("  " + "-" * 40)
    print(f"  {'层级':<6} {'QuadKey':<12}")
    print("  " + "-" * 40)
    for level in range(1, 11):
        qk = lat_lon_to_quadkey(LA_LAT, LA_LON, level)
        print(f"  Level {level:<2} {qk:<12}")
    print()
    
    # 3. 验证 QuadKey 覆盖范围
    print("[步骤3] 验证 QuadKey 覆盖范围")
    print(f"  QuadKey: {la_quadkey}")
    lat_min, lat_max, lon_min, lon_max = quadkey_to_lat_lon(la_quadkey)
    
    print(f"  纬度范围: {lat_min:.4f}N ~ {lat_max:.4f}N")
    print(f"  经度范围: {abs(lon_min):.4f}W ~ {abs(lon_max):.4f}W")
    print()
    
    # 4. 确认目标位置是否在范围内
    print("[步骤4] 确认目标位置")
    is_in_range = validate_quadkey_for_location(la_quadkey, LA_LAT, LA_LON)
    if is_in_range:
        print(f"  [OK] 洛杉矶市中心 ({LA_LAT}N, {abs(LA_LON)}W)")
        print(f"       在 QuadKey {la_quadkey} 覆盖范围内")
    else:
        print(f"  [FAIL] 洛杉矶市中心不在 QuadKey {la_quadkey} 覆盖范围内")
        print(f"         目标: ({LA_LAT}N, {abs(LA_LON)}W)")
        print(f"         范围: {lat_min:.4f}N~{lat_max:.4f}N, {abs(lon_min):.4f}W~{abs(lon_max):.4f}W")
    print()
    
    # 5. 输出结论
    print("=" * 60)
    print("结论")
    print("=" * 60)
    print(f"  洛杉矶市中心对应的 Level {TARGET_LEVEL} QuadKey 为:")
    print(f"  {la_quadkey}")
    print()
    print("  该 QuadKey 覆盖区域:")
    print(f"  北纬 {lat_min:.2f} ~ {lat_max:.2f}, 西经 {abs(lon_min):.2f} ~ {abs(lon_max):.2f}")
    print("=" * 60)