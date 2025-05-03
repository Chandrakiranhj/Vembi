# Defects Management

This document explains the Defects Management feature in the Vembi Inventory QC system.

## Overview

The Defects Management module allows users to:

1. View all defects reported in the system (from both returns and inventory)
2. Report new defects directly from inventory items
3. Track defect status, severity, and other details

## Defect Sources

Defects can come from two sources:

- **Returns QC**: Defects identified during the quality control process of returned items
- **Inventory**: Defects reported directly from inventory (e.g., damaged items discovered in stock)

## Inventory Defect Reporting

When a defect is reported from inventory:

1. The system creates a defect record with the specified details
2. One unit is automatically deducted from the selected batch
3. The defect is marked with an "[INVENTORY]" prefix in the description

## Page Structure

The Defects Management page consists of:

1. **Defects Table**: Displays all defects with filtering/search capabilities
2. **Report Defect Button**: Opens a dialog to report a new defect from inventory
3. **Defect Form**: Allows selection of component, batch, severity, and description

## API Endpoints

- `GET /api/defects`: Returns all defects
- `POST /api/defects/inventory`: Creates a new defect from inventory and deducts inventory

## User Permissions

The following roles can access different aspects of defect management:

- **View Defects**: Admin, Assembler, Return QC, Service Person
- **Create Defects**: Admin, Return QC, Service Person
- **Modify Defects**: Admin, Service Person
- **Delete Defects**: Admin only

## Future Enhancements

Planned enhancements for the Defects Management module:

1. Ability to update defect status and add resolution notes
2. Reporting and analytics for defect trends
3. Integration with vendor communication for defect reporting
4. Image upload capability for defect documentation 