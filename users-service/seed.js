require('dotenv').config();

const db = require('./src/models');

const seed = async () => {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Database connection established.');

    await db.sequelize.sync({ alter: true });
    console.log('✅ Database synchronized.');

    // ─── Create default admin user ────────────────────────────────────────────
    const [adminUser, adminCreated] = await db.User.findOrCreate({
      where: { email: 'admin@library.com' },
      defaults: {
        email: 'admin@library.com',
        password: 'Admin123!',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        department: 'Library Administration',
        isActive: true,
      },
    });

    if (adminCreated) {
      console.log('✅ Default admin user created:');
      console.log('   Email:    admin@library.com');
      console.log('   Password: Admin123!');
    } else {
      console.log('ℹ️  Admin user already exists, skipping.');
    }

    // ─── Create sample librarian user ─────────────────────────────────────────
    const [libUser, libCreated] = await db.User.findOrCreate({
      where: { email: 'librarian@library.com' },
      defaults: {
        email: 'librarian@library.com',
        password: 'Librarian123!',
        firstName: 'Sarah',
        lastName: 'Connor',
        role: 'librarian',
        department: 'Bibliothèque Centrale',
        isActive: true,
      },
    });

    if (libCreated) {
      console.log('✅ Sample librarian user created:');
      console.log('   Email:    librarian@library.com');
      console.log('   Password: Librarian123!');
    }

    // ─── Create sample student user ───────────────────────────────────────────
    const [studentUser, studentCreated] = await db.User.findOrCreate({
      where: { email: 'student@university.com' },
      defaults: {
        email: 'student@university.com',
        password: 'Student123!',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'student',
        studentId: 'STU-2024-001',
        department: 'Computer Science',
        isActive: true,
      },
    });

    if (studentCreated) {
      console.log('✅ Sample student user created:');
      console.log('   Email:    student@university.com');
      console.log('   Password: Student123!');
    } else {
      console.log('ℹ️  Student user already exists, skipping.');
    }

    console.log('\n🎉 Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seed();
