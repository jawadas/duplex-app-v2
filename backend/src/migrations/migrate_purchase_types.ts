import pool from '../config/database';
import { ResultSetHeader } from 'mysql2/promise';

interface PurchaseType {
  name: string;
  name_ar: string;
}

/**
 * Migrates the hardcoded purchase types from the frontend enum to the database
 */
async function migratePurchaseTypes() {
  try {
    console.log('Starting migration of purchase types...');

    // Default purchase types from the frontend enum
    const defaultTypes: PurchaseType[] = [
      { name: 'Furniture', name_ar: 'أثاث' },
      { name: 'Electronics', name_ar: 'إلكترونيات' },
      { name: 'Construction', name_ar: 'مواد البناء' },
      { name: 'Miscellaneous', name_ar: 'متنوع' },
      { name: 'Cement', name_ar: 'اسمنت' },
      { name: 'Sand', name_ar: 'رمل' },
      { name: 'Water', name_ar: 'ماء' },
      { name: 'Pulp', name_ar: 'لمبات' }
    ];

    // Check which types already exist in the database
    const [existingTypes] = await pool.query<any[]>(`
      SELECT name FROM purchase_types
    `);

    const existingNames = existingTypes.map(type => type.name);
    console.log('Existing purchase types:', existingNames);

    // Only insert types that don't already exist
    const typesToInsert = defaultTypes.filter(type => !existingNames.includes(type.name));
    console.log(`Found ${typesToInsert.length} new types to insert`);

    if (typesToInsert.length === 0) {
      console.log('No new purchase types to migrate. All types already exist in the database.');
      return;
    }

    // Insert the new types
    let insertedCount = 0;
    for (const type of typesToInsert) {
      try {
        const [result] = await pool.query<ResultSetHeader>(`
          INSERT INTO purchase_types (name, name_ar, created_by) 
          VALUES (?, ?, ?)
        `, [type.name, type.name_ar, 'migration_script']);

        if (result.affectedRows > 0) {
          insertedCount++;
          console.log(`Inserted purchase type: ${type.name} (${type.name_ar})`);
        }
      } catch (error) {
        console.error(`Error inserting purchase type ${type.name}:`, error);
      }
    }

    console.log(`Migration completed. Inserted ${insertedCount} purchase types.`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the migration
migratePurchaseTypes()
  .then(() => {
    console.log('Migration process completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration process failed:', error);
    process.exit(1);
  }); 