# Vembi Inventory & QC System

A comprehensive inventory management and quality control system for Vembi, an electronics manufacturing company. This application is designed to transition the company's operations from Google Sheets/Apps Script to a more robust, full-stack solution with improved security, real-time data management, and role-based access controls.

## Features

- **User Authentication & Role Management**
  - Secure login with Clerk authentication
  - Role-based access (Admin, Assembler, Return QC, Service Person)
  - User profile management

- **Dashboard & Analytics**
  - Real-time overview of inventory status
  - Low stock alerts
  - Component usage metrics
  - Recent activities tracking

- **Inventory Management**
  - Component tracking with minimum quantity alerts
  - Category-based organization
  - Search and filtering capabilities
  - Batch tracking for incoming components

- **Assembly Quality Control**
  - Model number lookup
  - Component inspection checklist
  - Pass/fail status tracking
  - Notes and documentation

- **Returns Quality Control**
  - Customer return processing
  - Component inspection for defects
  - Return status tracking
  - Defect logging and resolution tracking

- **Defects Log**
  - Detailed defect documentation
  - Severity classification
  - Resolution tracking
  - Historical defect analysis

- **Component Reporting**
  - Ability for service personnel to report component issues
  - Linking reports to specific batches/components
  - Documentation of issues

- **Search & Reporting**
  - Cross-entity search functionality
  - Custom report generation
  - Data export options

## Technology Stack

- **Frontend**
  - Next.js 
  - React 
  - TailwindCSS
  - Lucide React (icons)
  - Clerk (authentication)

- **Backend**
  - Next.js API Routes
  - Prisma ORM
  - MongoDB

- **Development Tools**
  - TypeScript
  - Prisma Studio

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- MongoDB Atlas account or local MongoDB instance

### Installation

1. Clone the repository
   ```
   git clone https://github.com/your-username/vembi-inventory-qc.git
   cd vembi-inventory-qc
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up environment variables
   ```
   cp .env.example .env.local
   ```
   Edit `.env.local` with your configuration details.

4. Set up the database
   ```
   npx prisma generate
   npx prisma db push
   ```

5. Run the development server
   ```
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## User Roles & Permissions

- **Admin**: Full access to all features and data
- **Assembler**: Access to assembly QC features and limited inventory access
- **Return QC**: Process customer returns and inspect returned components
- **Service Person**: Report component defects and view component information

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Vembi Team for providing requirements and feedback
- Open source community for the amazing tools and libraries
