/**
 * seedFirebase.js — utility script to seed initial project data.
 * Run manually via: node src/scripts/seedFirebase.js
 *
 * Update the arrays below with your own seed data before running.
 */
import { setCategoryBatch, categories } from '../services/firestore';

async function seed() {
  console.log('Seeding Firestore with initial data...');

  // Add seed data here as needed:
  // await setCategoryBatch(categories.projects, [ { id: 'proj-001', ... } ]);

  console.log('Done.');
}

seed().catch(console.error);
