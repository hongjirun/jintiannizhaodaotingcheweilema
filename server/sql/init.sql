-- 创建数据库
CREATE DATABASE IF NOT EXISTS parking_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE parking_db;

-- 停车场表
CREATE TABLE IF NOT EXISTS `parking_lot` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `poi_id` varchar(50) DEFAULT NULL COMMENT '腾讯POI ID（去重用）',
  `name` varchar(100) NOT NULL COMMENT '停车场名称',
  `address` varchar(255) DEFAULT NULL COMMENT '详细地址',
  `city` varchar(50) DEFAULT NULL COMMENT '城市',
  `province` varchar(50) DEFAULT NULL COMMENT '省份',
  `longitude` decimal(11,8) NOT NULL DEFAULT '0.00000000' COMMENT '经度(GCJ-02)',
  `latitude` decimal(10,8) NOT NULL DEFAULT '0.00000000' COMMENT '纬度(GCJ-02)',
  `cover_image` varchar(500) DEFAULT NULL COMMENT '封面图',
  `phone` varchar(20) DEFAULT NULL COMMENT '联系电话',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态: 0停用 1启用',
  `data_source` varchar(20) NOT NULL DEFAULT 'manual' COMMENT '来源: tencent/manual/excel',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_city` (`city`),
  INDEX `idx_status` (`status`),
  INDEX `idx_lat_lng` (`latitude`, `longitude`),
  UNIQUE INDEX `idx_poi_id` (`poi_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='停车场表';

-- 管理员表
CREATE TABLE IF NOT EXISTS `admin_user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL COMMENT '账号',
  `password` varchar(255) NOT NULL COMMENT 'bcrypt加密密码',
  `role` varchar(20) NOT NULL DEFAULT 'admin' COMMENT '角色: super/admin',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员表';
