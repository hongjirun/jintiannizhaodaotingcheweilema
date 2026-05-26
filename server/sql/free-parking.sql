-- 免费停车点位上报表
CREATE TABLE IF NOT EXISTS `free_parking_report` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name` varchar(100) NOT NULL COMMENT '停车场名称',
  `address` varchar(200) NOT NULL COMMENT '详细地址',
  `latitude` decimal(10,6) NOT NULL COMMENT '纬度',
  `longitude` decimal(10,6) NOT NULL COMMENT '经度',
  `freeTimeStart` varchar(20) NOT NULL COMMENT '免费开始时间',
  `freeTimeEnd` varchar(20) NOT NULL COMMENT '免费结束时间',
  `parkingSpaces` int DEFAULT NULL COMMENT '车位数量',
  `freeType` varchar(20) DEFAULT 'night' COMMENT '免费类型: night/weekend/allday/holiday',
  `remark` text COMMENT '备注说明',
  `images` json DEFAULT NULL COMMENT '上传图片URL列表',
  `reporterName` varchar(50) DEFAULT NULL COMMENT '上报人微信昵称',
  `reporterAvatar` varchar(100) DEFAULT NULL COMMENT '上报人微信头像',
  `status` int DEFAULT 0 COMMENT '审核状态: 0-待审核, 1-已通过, 2-已拒绝',
  `reviewRemark` text COMMENT '审核备注',
  `reviewTime` datetime DEFAULT NULL COMMENT '审核时间',
  `reviewerName` varchar(50) DEFAULT NULL COMMENT '审核管理员',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_location` (`latitude`, `longitude`),
  KEY `idx_createdAt` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='免费停车点位上报表';

-- 系统配置表（用于控制上报功能开关）
CREATE TABLE IF NOT EXISTS `system_config` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `configKey` varchar(50) NOT NULL UNIQUE COMMENT '配置键',
  `configValue` text NOT NULL COMMENT '配置值',
  `description` varchar(200) DEFAULT NULL COMMENT '配置描述',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_configKey` (`configKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- 插入默认配置
INSERT IGNORE INTO `system_config` (`configKey`, `configValue`, `description`) VALUES
('free_parking_report_enabled', 'true', '免费停车点位上报功能开关'),
('free_parking_report_notice', '感谢您上报免费停车点位，我们将在1-3个工作日内审核通过。', '上报功能提示文案');
