import request from 'supertest';
import app from '../src/app.js';
import { setupTestDB } from './setup.js';
import { User } from '../src/models/User.js';
import { ParkingSite } from '../src/models/ParkingSite.js';
import { ParkingSlot } from '../src/models/ParkingSlot.js';
import { TokenService } from '../src/services/tokenService.js';

describe('Atomic Booking & Slot Concurrency Flow', () => {
  setupTestDB();

  test('Concurrent booking of the same slot - only one user wins', async () => {
    // 1. Create two distinct users
    const [userA, userB] = await Promise.all([
      User.create({
        name: 'User A',
        email: 'usera@test.com',
        phone: '9870000001',
        passwordHash: 'hash',
        role: 'user',
        vehicleNumber: 'KA-01-A-1111',
      }),
      User.create({
        name: 'User B',
        email: 'userb@test.com',
        phone: '9870000002',
        passwordHash: 'hash',
        role: 'user',
        vehicleNumber: 'KA-01-B-2222',
      }),
    ]);

    const tokenA = TokenService.generateAccessToken(userA);
    const tokenB = TokenService.generateAccessToken(userB);

    // 2. Create parking site with exactly 1 available slot
    const site = await ParkingSite.create({
      name: 'Single Slot Parking Hub',
      address: '1st Main Road',
      area: 'Koramangala',
      postalCode: '560034',
      location: { type: 'Point', coordinates: [77.62, 12.93] },
      hourlyRate: 50,
      minimumCharge: 20,
      totalSlots: 1,
      isActive: true,
    });

    const slot = await ParkingSlot.create({
      site: site._id,
      slotNumber: 'S-01',
      status: 'available',
    });

    // 3. Fire simultaneous booking requests for that exact slot
    const [resA, resB] = await Promise.all([
      request(app)
        .post('/api/v1/parking/bookings')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          siteId: site._id.toString(),
          slotId: slot._id.toString(),
          vehicleNumber: 'KA-01-A-1111',
          bookedHours: 2,
        }),
      request(app)
        .post('/api/v1/parking/bookings')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          siteId: site._id.toString(),
          slotId: slot._id.toString(),
          vehicleNumber: 'KA-01-B-2222',
          bookedHours: 2,
        }),
    ]);

    const statuses = [resA.status, resB.status].sort();

    // Exactly one must succeed (201) and exactly one must fail with conflict (409)
    expect(statuses).toEqual([201, 409]);

    // Check slot is reserved in database
    const updatedSlot = await ParkingSlot.findById(slot._id);
    expect(updatedSlot.status).toBe('reserved');
  });
});

