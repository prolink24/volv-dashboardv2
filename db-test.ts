import { db } from './server/db';
import { contacts } from './shared/schema';

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    
    // Try to insert a test contact
    const [newContact] = await db.insert(contacts).values({
      name: 'Test Contact',
      email: 'test@example.com',
      status: 'lead',
      createdAt: new Date()
    }).returning();
    
    console.log('Successfully inserted test contact:', newContact);
    
    // Query all contacts
    const allContacts = await db.select().from(contacts);
    console.log(`Found ${allContacts.length} contacts in database:`);
    allContacts.forEach(c => console.log(` - ${c.id}: ${c.name} (${c.email})`));
    
    process.exit(0);
  } catch (error) {
    console.error('Database test error:', error);
    process.exit(1);
  }
}

testDatabaseConnection();