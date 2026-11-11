import { connectDB, closeDB } from '../config/db.js';
import { User } from '../models/User.js';
import { ParkingSite } from '../models/ParkingSite.js';
import { ParkingSlot } from '../models/ParkingSlot.js';

const seedAdmin = async () => {
  try {
    console.log('[Seed] Connecting to database...');
    await connectDB();
    console.log('[Seed] Connected to database.');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@parkeasy.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';
    const adminPhone = process.env.ADMIN_PHONE || '9999999999';

    // 1. Seed Demo Parking Site 1 (Tech Hub / City Center)
    let site1 = await ParkingSite.findOne({ name: 'Central Tech Park' });
    if (!site1) {
      site1 = await ParkingSite.create({
        name: 'Central Tech Park',
        address: '100 Silicon Boulevard, Tech Zone',
        area: 'Indiranagar',
        postalCode: '560038',
        location: {
          type: 'Point',
          coordinates: [77.6412, 12.9716], // [lng, lat]
        },
        hourlyRate: 40,
        minimumCharge: 40,
        totalSlots: 10,
        isActive: true,
      });

      // Generate 10 slots
      const slots = [];
      for (let i = 1; i <= 10; i++) {
        slots.push({
          site: site1._id,
          slotNumber: `A-${String(i).padStart(2, '0')}`,
          status: 'available',
        });
      }
      await ParkingSlot.insertMany(slots);
      console.log(`[Seed] Site 1 created with 10 slots: ${site1.name}`);
    }

    // 2. Seed Demo Parking Site 2 (Metro Plaza)
    let site2 = await ParkingSite.findOne({ name: 'Metro Plaza Parking' });
    if (!site2) {
      site2 = await ParkingSite.create({
        name: 'Metro Plaza Parking',
        address: '45 Station Road, Downtown',
        area: 'MG Road',
        postalCode: '560001',
        location: {
          type: 'Point',
          coordinates: [77.6074, 12.9754],
        },
        hourlyRate: 50,
        minimumCharge: 50,
        totalSlots: 8,
        isActive: true,
      });

      const slots = [];
      for (let i = 1; i <= 8; i++) {
        slots.push({
          site: site2._id,
          slotNumber: `B-${String(i).padStart(2, '0')}`,
          status: 'available',
        });
      }
      await ParkingSlot.insertMany(slots);
      console.log(`[Seed] Site 2 created with 8 slots: ${site2.name}`);
    }

    // 3. Seed Admin
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      const passwordHash = await User.hashPassword(adminPassword);
      admin = await User.create({
        name: 'System Admin',
        email: adminEmail,
        phone: adminPhone,
        passwordHash,
        role: 'admin',
        walletBalance: 0,
        isActive: true,
      });
      console.log(`[Seed] Admin created: ${admin.email}`);
    } else {
      console.log(`[Seed] Admin exists: ${admin.email}`);
    }

    // 4. Seed Handler assigned to Site 1
    let handler = await User.findOne({ email: 'handler@parkeasy.com' });
    if (!handler) {
      const passwordHash = await User.hashPassword('Handler@12345');
      handler = await User.create({
        name: 'Site Handler',
        email: 'handler@parkeasy.com',
        phone: '9888888888',
        passwordHash,
        role: 'handler',
        assignedSite: site1._id,
        walletBalance: 0,
        isActive: true,
      });
      console.log(`[Seed] Demo Handler created & assigned to ${site1.name}: ${handler.email}`);
    } else {
      if (!handler.assignedSite && site1) {
        handler.assignedSite = site1._id;
        await handler.save();
      }
      console.log(`[Seed] Demo Handler exists: ${handler.email}`);
    }

    // 5. Seed Demo Car Owner
    let user = await User.findOne({ email: 'user@parkeasy.com' });
    if (!user) {
      const passwordHash = await User.hashPassword('User@12345');
      user = await User.create({
        name: 'Car Owner',
        email: 'user@parkeasy.com',
        phone: '9777777777',
        passwordHash,
        role: 'user',
        walletBalance: 500,
        vehicleNumber: 'KA-01-AB-1234',
        isActive: true,
      });
      console.log(`[Seed] Demo User created: ${user.email} (Wallet: ₹500)`);
    } else {
      console.log(`[Seed] Demo User exists: ${user.email}`);
    }

    console.log('==================================================');
    console.log('  PARKEASY SEED COMPLETE — READY FOR TESTING');
    console.log('==================================================');
    console.log('  Admin:   admin@parkeasy.com   / Admin@12345');
    console.log('  Handler: handler@parkeasy.com / Handler@12345');
    console.log('  User:    user@parkeasy.com    / User@12345');
    console.log('==================================================');

    await closeDB();
    process.exit(0);
  } catch (error) {
    console.error(`[Seed] Fatal error: ${error.message}`);
    await closeDB();
    process.exit(1);
  }
};

seedAdmin();
