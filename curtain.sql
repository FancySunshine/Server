/*
SQLyog Community v13.1.5  (64 bit)
MySQL - 8.0.18 : Database - curtain
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`curtain` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `curtain`;

/*Table structure for table `control` */

DROP TABLE IF EXISTS `control`;

CREATE TABLE `control` (
  `Name` char(20) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `StartTime` char(10) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `ctr` int(1) DEFAULT NULL,
  `dayofweek` char(7) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `Memo` char(50) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `curtain_num` int(4) DEFAULT NULL,
  `chk_state` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`Name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `control` */

insert  into `control`(`Name`,`StartTime`,`ctr`,`dayofweek`,`Memo`,`curtain_num`,`chk_state`) values 
('1829302','9:32',3,'0110110','',NULL,0),
('tctc6g6','13:46',0,'0100110','',NULL,0),
('w818w','17:53',0,'0000110','',NULL,0),
('공부','9:00',2,'1000101','4',NULL,0),
('댜댜더더','19:0',2,'1100101','너머재재재',NULL,0),
('도현도','20:16',2,'1101100','',NULL,0);

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
