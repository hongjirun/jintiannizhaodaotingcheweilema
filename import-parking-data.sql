-- 免费停车点位数据导入脚本（支持重复导入过滤）
-- 执行方式: mysql -u root -p'123456' -D 数据库名 < import-parking-data.sql

-- 使用 parking 数据库（请根据实际情况修改）
-- USE parking;

-- 添加唯一约束防止重复导入（MySQL 5.7 兼容版本）
-- 如果约束已存在会报错，可以忽略这个错误

-- 使用 INSERT IGNORE 跳过已存在的记录
-- 或使用 ON DUPLICATE KEY UPDATE 更新现有记录

INSERT INTO free_parking_report 
(name, address, latitude, longitude, freeTimeStart, freeTimeEnd, parkingSpaces, freeType, status, reporterName, remark) 
VALUES
-- 广州市示例点位
('天河城停车场', '广州市天河区天河路208号', 23.134201, 113.319913, '22:00', '08:00', 500, 'night', 1, '系统导入', '夜间免费停车'),
('正佳广场停车场', '广州市天河区天河路228号', 23.132523, 113.321456, '22:00', '09:00', 800, 'night', 1, '系统导入', '夜间时段免费'),
('太古汇停车场', '广州市天河区天河路383号', 23.136789, 113.318234, '23:00', '07:00', 600, 'night', 1, '系统导入', '深夜免费停车'),
('万达广场(白云)', '广州市白云区云城东路501号', 23.186523, 113.268901, '20:00', '08:00', 1200, 'night', 1, '系统导入', '夜间8点后免费'),
('花城汇停车场', '广州市天河区珠江新城花城大道', 23.120123, 113.324567, '00:00', '23:59', 2000, 'allday', 0, '系统导入', '周末全天免费，工作日夜间免费'),

-- 深圳市示例点位
('COCO Park停车场', '深圳市福田区福华三路268号', 22.542345, 114.059123, '22:00', '08:00', 1500, 'night', 1, '系统导入', '夜间免费'),
('万象城停车场', '深圳市罗湖区宝安南路1881号', 22.543456, 114.107234, '21:00', '09:00', 2000, 'night', 1, '系统导入', '夜间9点后免费'),
('海岸城停车场', '深圳市南山区文心五路33号', 22.518901, 113.942345, '20:00', '10:00', 1800, 'night', 1, '系统导入', '夜间免费停车'),

-- 更多广州点位
('北京路商圈停车场', '广州市越秀区北京路', 23.126789, 113.271234, '22:30', '07:30', 300, 'night', 0, '系统导入', '老城区夜间免费'),
('上下九停车场', '广州市荔湾区上下九步行街', 23.114567, 113.248901, '21:00', '08:00', 400, 'night', 1, '系统导入', '步行街夜间免费'),
('琶洲会展中心停车场', '广州市海珠区阅江中路380号', 23.101234, 113.361456, '18:00', '08:00', 3000, 'night', 1, '系统导入', '展会期间收费，平时夜间免费'),
('广州塔停车场', '广州市海珠区阅江西路222号', 23.106789, 113.325678, '22:00', '06:00', 800, 'night', 0, '系统导入', '景点夜间免费'),
('白云山停车场', '广州市白云区广园中路801号', 23.198901, 113.301234, '06:00', '18:00', 500, 'weekend', 1, '系统导入', '周末免费，工作日收费'),

-- 佛山点位
('千灯湖停车场', '佛山市南海区桂城街道', 23.041234, 113.141567, '20:00', '08:00', 1000, 'night', 1, '系统导入', '夜间免费'),
('祖庙商圈停车场', '佛山市禅城区祖庙路', 23.036789, 113.128901, '22:00', '08:00', 600, 'night', 0, '系统导入', '商圈夜间免费'),

-- 东莞点位
('鸿福路停车场', '东莞市南城区鸿福路', 23.021456, 113.751234, '19:00', '07:00', 800, 'night', 1, '系统导入', '晚间时段免费'),
('虎门万达停车场', '东莞市虎门镇', 22.818901, 113.678901, '21:00', '09:00', 1200, 'night', 1, '系统导入', '夜间免费停车')

-- 如果记录已存在则更新，不存在则插入
ON DUPLICATE KEY UPDATE
latitude = VALUES(latitude),
longitude = VALUES(longitude),
freeTimeStart = VALUES(freeTimeStart),
freeTimeEnd = VALUES(freeTimeEnd),
parkingSpaces = VALUES(parkingSpaces),
freeType = VALUES(freeType),
status = VALUES(status),
remark = VALUES(remark),
updatedAt = NOW();

-- 查看导入结果（按城市分组统计）
SELECT 
  CASE 
    WHEN address LIKE '%广州%' THEN '广州市'
    WHEN address LIKE '%深圳%' THEN '深圳市'
    WHEN address LIKE '%佛山%' THEN '佛山市'
    WHEN address LIKE '%东莞%' THEN '东莞市'
    ELSE '其他城市'
  END as 城市,
  COUNT(*) as 点位数量,
  SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as 已通过,
  SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as 待审核
FROM free_parking_report 
WHERE reporterName = '系统导入'
GROUP BY 城市;

-- 查看最近导入的20条记录
SELECT id, name, address, latitude, longitude, freeType, status, createdAt 
FROM free_parking_report 
WHERE reporterName = '系统导入'
ORDER BY id DESC 
LIMIT 20;
