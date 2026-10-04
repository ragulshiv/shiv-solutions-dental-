-- AlterTable
ALTER TABLE `Appointment` ADD COLUMN `clinicalNotes` TEXT NULL;

-- AlterTable
ALTER TABLE `Prescription` ADD COLUMN `appointmentId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `TreatmentPlanItem` ADD COLUMN `treatmentId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Prescription_appointmentId_idx` ON `Prescription`(`appointmentId`);

-- CreateIndex
CREATE UNIQUE INDEX `TreatmentPlanItem_treatmentId_key` ON `TreatmentPlanItem`(`treatmentId`);

-- AddForeignKey
ALTER TABLE `TreatmentPlanItem` ADD CONSTRAINT `TreatmentPlanItem_treatmentId_fkey` FOREIGN KEY (`treatmentId`) REFERENCES `Treatment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Prescription` ADD CONSTRAINT `Prescription_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `Appointment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- The app adds "Dr." in front of doctor names itself; remove a typed prefix
-- so names don't show as "Dr. Dr. Priya".
UPDATE `Staff` SET `firstName` = TRIM(REGEXP_REPLACE(`firstName`, '^[Dd][Rr]\.?[[:space:]]+', ''))
WHERE `firstName` REGEXP '^[Dd][Rr]\.?[[:space:]]+';
