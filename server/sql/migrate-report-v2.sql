-- 迁移脚本 v2：放宽 free_parking_report 字段约束，新增 hourlyPrice
-- 在线上数据库执行此脚本

ALTER TABLE `free_parking_report`
  MODIFY COLUMN `address` varchar(200) DEFAULT NULL COMMENT '详细地址',
  MODIFY COLUMN `freeTimeStart` varchar(20) DEFAULT NULL COMMENT '免费开始时间',
  MODIFY COLUMN `freeTimeEnd` varchar(20) DEFAULT NULL COMMENT '免费结束时间',
  MODIFY COLUMN `freeType` varchar(20) DEFAULT 'night' COMMENT '免费类型: night/weekend/allday/holiday/not_free',
  ADD COLUMN IF NOT EXISTS `hourlyPrice` decimal(8,2) DEFAULT NULL COMMENT '每小时价格（不免费时填写）';

-- 确保 system_config 表和初始数据存在
CREATE TABLE IF NOT EXISTS `system_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `configKey` varchar(50) NOT NULL UNIQUE COMMENT '配置键',
  `configValue` text NOT NULL COMMENT '配置值',
  `description` varchar(200) DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_configKey` (`configKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `system_config` (`configKey`, `configValue`, `description`) VALUES
('free_parking_report_enabled', 'true', '免费停车点位上报功能开关');
